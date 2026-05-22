const dns = require('dns');
const net = require('net');
const { getDidYouMean } = require('./typoDetector');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateSyntax(email) {
  if (!email || typeof email !== 'string') return false;
  if (email.length > 254) return false;
  if (email.indexOf('@') !== email.lastIndexOf('@')) return false;
  if (email.includes('..')) return false;

  return EMAIL_REGEX.test(email);
}

function resolveMxRecords(domain) {
  return new Promise((resolve) => {
    dns.resolveMx(domain, (err, addresses) => {
      if (err || !addresses || addresses.length === 0) {
        resolve([]);
      } else {
        addresses.sort((a, b) => a.priority - b.priority);
        resolve(addresses.map(record => record.exchange));
      }
    });
  });
}

function checkSMTP(mxRecord, email, senderEmail = 'verify@example.com') {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let step = 0;
    let responseData = '';
    let resolved = false;

    socket.setTimeout(5000);

    const finish = (result) => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
        resolve(result);
      }
    };

    socket.on('data', (data) => {
      responseData += data.toString();
      
      if (!responseData.endsWith('\r\n')) {
          return; 
      }
      
      const lines = responseData.trim().split('\n');
      const lastLine = lines[lines.length - 1];
      const responseCode = parseInt(lastLine.substring(0, 3), 10);
      
      responseData = '';

      switch (step) {
        case 0:
          if (responseCode === 220) {
            socket.write(`EHLO example.com\r\n`);
            step++;
          } else {
            finish({ code: responseCode, status: 'unknown', subresult: 'connection_error' });
          }
          break;
        case 1:
          if (responseCode === 250) {
            socket.write(`MAIL FROM:<${senderEmail}>\r\n`);
            step++;
          } else {
            finish({ code: responseCode, status: 'unknown', subresult: 'ehlo_failed' });
          }
          break;
        case 2:
          if (responseCode === 250) {
            socket.write(`RCPT TO:<${email}>\r\n`);
            step++;
          } else {
            finish({ code: responseCode, status: 'unknown', subresult: 'mail_from_failed' });
          }
          break;
        case 3:
          if (responseCode === 250 || responseCode === 251) {
            socket.write(`QUIT\r\n`);
            finish({ code: responseCode, status: 'valid', subresult: 'mailbox_exists' });
          } else if (responseCode === 550 || responseCode === 551 || responseCode === 552 || responseCode === 553) {
            socket.write(`QUIT\r\n`);
            finish({ code: responseCode, status: 'invalid', subresult: 'mailbox_does_not_exist' });
          } else if (responseCode >= 400 && responseCode < 500) {
            socket.write(`QUIT\r\n`);
            finish({ code: responseCode, status: 'unknown', subresult: 'greylisted' });
          } else {
            socket.write(`QUIT\r\n`);
            finish({ code: responseCode, status: 'unknown', subresult: 'unhandled_smtp_response' });
          }
          break;
      }
    });

    socket.on('error', (err) => {
      finish({ code: null, status: 'unknown', subresult: 'connection_error', error: err.message });
    });

    socket.on('timeout', () => {
      finish({ code: null, status: 'unknown', subresult: 'connection_timeout', error: 'Timeout connecting to MX server' });
    });

    socket.connect(25, mxRecord);
  });
}

async function verifyEmail(email) {
  const startTime = Date.now();
  
  const resultObj = {
    email: email,
    result: "unknown",
    resultcode: 3,
    subresult: "",
    domain: "",
    mxRecords: [],
    executiontime: 0,
    error: null,
    timestamp: new Date().toISOString()
  };

  if (!validateSyntax(email)) {
    resultObj.result = "invalid";
    resultObj.resultcode = 6;
    resultObj.subresult = "invalid_syntax";
  }

  const didYouMean = getDidYouMean(email);
  if (didYouMean) {
    resultObj.didyoumean = didYouMean;
    resultObj.result = "invalid";
    resultObj.resultcode = 6;
    resultObj.subresult = "typo_detected";
    resultObj.executiontime = (Date.now() - startTime) / 1000;
    
    const parts = email && typeof email === 'string' ? email.split('@') : [];
    if (parts.length === 2) resultObj.domain = parts[1];
    
    return resultObj;
  }
  
  if (resultObj.result === "invalid" && resultObj.subresult === "invalid_syntax") {
      resultObj.executiontime = (Date.now() - startTime) / 1000;
      return resultObj;
  }

  const domain = email.split('@')[1];
  resultObj.domain = domain;

  try {
    const mxRecords = await resolveMxRecords(domain);
    resultObj.mxRecords = mxRecords;

    if (mxRecords.length === 0) {
      resultObj.result = "invalid";
      resultObj.resultcode = 6;
      resultObj.subresult = "no_mx_records";
      resultObj.executiontime = (Date.now() - startTime) / 1000;
      return resultObj;
    }

    const mxToTry = mxRecords[0];
    const smtpResult = await checkSMTP(mxToTry, email);

    resultObj.result = smtpResult.status;
    resultObj.resultcode = smtpResult.status === 'valid' ? 1 : (smtpResult.status === 'invalid' ? 6 : 3);
    resultObj.subresult = smtpResult.subresult;
    
    if (smtpResult.error) {
      resultObj.error = smtpResult.error;
    }

  } catch (error) {
    resultObj.result = "unknown";
    resultObj.resultcode = 3;
    resultObj.subresult = "lookup_error";
    resultObj.error = error.message;
  }

  resultObj.executiontime = (Date.now() - startTime) / 1000;
  return resultObj;
}

module.exports = {
  verifyEmail,
  validateSyntax,
  resolveMxRecords,
  checkSMTP
};
