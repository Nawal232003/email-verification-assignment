const { verifyEmail, validateSyntax } = require('./verifier');
const { getDidYouMean } = require('./typoDetector');
const dns = require('dns');
const net = require('net');

jest.mock('dns');
jest.mock('net');

describe('Email Verifier Module', () => {

  describe('Syntax Validation', () => {
    it('should pass valid email formats', () => {
      expect(validateSyntax('user@example.com')).toBe(true);
      expect(validateSyntax('test.name+tag@domain.co.uk')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(validateSyntax('userexample.com')).toBe(false); // missing @
      expect(validateSyntax('user@example..com')).toBe(false); // double dot
      expect(validateSyntax('user@@example.com')).toBe(false); // double @
    });

    it('should reject email with spaces', () => {
      expect(validateSyntax('user name@example.com')).toBe(false);
      expect(validateSyntax('user@exam ple.com')).toBe(false);
    });

    it('should handle empty string', () => {
      expect(validateSyntax('')).toBe(false);
    });

    it('should handle null or undefined', () => {
      expect(validateSyntax(null)).toBe(false);
      expect(validateSyntax(undefined)).toBe(false);
    });

    it('should reject excessively long emails', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      expect(validateSyntax(longEmail)).toBe(false);
    });
  });

  describe('Typo Detection', () => {
    it('should detect and suggest corrections for common typos', () => {
      expect(getDidYouMean('user@gmial.com')).toBe('user@gmail.com');
      expect(getDidYouMean('user@yahooo.com')).toBe('user@yahoo.com');
      expect(getDidYouMean('user@hotmial.com')).toBe('user@hotmail.com');
      expect(getDidYouMean('user@outlok.com')).toBe('user@outlook.com');
    });

    it('should not suggest correction for valid domains', () => {
      expect(getDidYouMean('user@gmail.com')).toBeNull();
      expect(getDidYouMean('user@customdomain.com')).toBeNull(); // Distance > 2
    });
  });

  describe('verifyEmail Integration (Mocked DNS & NET)', () => {
    let mockSocket;

    beforeEach(() => {
      jest.clearAllMocks();
      
      mockSocket = {
        connect: jest.fn(),
        write: jest.fn(),
        on: jest.fn(),
        setTimeout: jest.fn(),
        destroy: jest.fn()
      };
      
      net.Socket.mockImplementation(() => mockSocket);
    });

    it('should return invalid for syntax error', async () => {
      const result = await verifyEmail('invalid-email');
      expect(result.result).toBe('invalid');
      expect(result.subresult).toBe('invalid_syntax');
      expect(result.resultcode).toBe(6);
    });

    it('should return invalid for typo detected', async () => {
      const result = await verifyEmail('user@gmial.com');
      expect(result.result).toBe('invalid');
      expect(result.subresult).toBe('typo_detected');
      expect(result.didyoumean).toBe('user@gmail.com');
      expect(result.resultcode).toBe(6);
    });

    it('should return invalid if no MX records found', async () => {
      dns.resolveMx.mockImplementation((domain, callback) => {
        callback(null, []);
      });

      const result = await verifyEmail('user@nomx.com');
      expect(result.result).toBe('invalid');
      expect(result.subresult).toBe('no_mx_records');
      expect(result.resultcode).toBe(6);
    });

    // Helper to simulate SMTP conversation
    const simulateSMTP = (socket, responses) => {
      socket.connect.mockImplementation(() => {
        // Find the 'data' event handler
        const dataHandler = socket.on.mock.calls.find(call => call[0] === 'data')[1];
        
        // Simulate sending responses sequentially
        responses.forEach((res, index) => {
          setTimeout(() => {
             dataHandler(res);
          }, index * 10);
        });
      });
    };

    it('should return valid if SMTP responds 250 to RCPT TO', async () => {
      dns.resolveMx.mockImplementation((domain, callback) => {
        callback(null, [{ exchange: 'mx.example.com', priority: 10 }]);
      });

      simulateSMTP(mockSocket, [
        '220 mx.example.com ESMTP\r\n',
        '250 Hello\r\n',
        '250 Sender OK\r\n',
        '250 Recipient OK\r\n'
      ]);

      const result = await verifyEmail('user@example.com');
      expect(result.result).toBe('valid');
      expect(result.subresult).toBe('mailbox_exists');
      expect(result.resultcode).toBe(1);
    });

    it('should return invalid if SMTP responds 550 to RCPT TO', async () => {
      dns.resolveMx.mockImplementation((domain, callback) => {
        callback(null, [{ exchange: 'mx.example.com', priority: 10 }]);
      });

      simulateSMTP(mockSocket, [
        '220 mx.example.com ESMTP\r\n',
        '250 Hello\r\n',
        '250 Sender OK\r\n',
        '550 Mailbox not found\r\n'
      ]);

      const result = await verifyEmail('user@example.com');
      expect(result.result).toBe('invalid');
      expect(result.subresult).toBe('mailbox_does_not_exist');
      expect(result.resultcode).toBe(6);
    });

    it('should return unknown if SMTP responds 450 to RCPT TO', async () => {
      dns.resolveMx.mockImplementation((domain, callback) => {
        callback(null, [{ exchange: 'mx.example.com', priority: 10 }]);
      });

      simulateSMTP(mockSocket, [
        '220 mx.example.com ESMTP\r\n',
        '250 Hello\r\n',
        '250 Sender OK\r\n',
        '450 Greylisted\r\n'
      ]);

      const result = await verifyEmail('user@example.com');
      expect(result.result).toBe('unknown');
      expect(result.subresult).toBe('greylisted');
      expect(result.resultcode).toBe(3);
    });

    it('should return unknown on connection timeout', async () => {
      dns.resolveMx.mockImplementation((domain, callback) => {
        callback(null, [{ exchange: 'mx.example.com', priority: 10 }]);
      });

      mockSocket.connect.mockImplementation(() => {
        const timeoutHandler = mockSocket.on.mock.calls.find(call => call[0] === 'timeout')[1];
        setTimeout(() => timeoutHandler(), 10);
      });

      const result = await verifyEmail('user@example.com');
      expect(result.result).toBe('unknown');
      expect(result.subresult).toBe('connection_timeout');
      expect(result.resultcode).toBe(3);
    });

    it('should return unknown on connection error', async () => {
      dns.resolveMx.mockImplementation((domain, callback) => {
        callback(null, [{ exchange: 'mx.example.com', priority: 10 }]);
      });

      mockSocket.connect.mockImplementation(() => {
        const errorHandler = mockSocket.on.mock.calls.find(call => call[0] === 'error')[1];
        setTimeout(() => errorHandler(new Error('ECONNREFUSED')), 10);
      });

      const result = await verifyEmail('user@example.com');
      expect(result.result).toBe('unknown');
      expect(result.subresult).toBe('connection_error');
      expect(result.resultcode).toBe(3);
      expect(result.error).toBe('ECONNREFUSED');
    });
  });
});
