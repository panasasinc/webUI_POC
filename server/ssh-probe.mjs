import { Client } from 'ssh2';

const SHELL_RE = /[#$]\s*$/m;
const PANCLI_RE = /\[pancli\]\s*$/m;

// Exact commands the services use
const commands = [
  'bladeset list allcolumns',
  'volume list allcolumns',
  'eventlog -output tab -count 200',
  'sysstat storage',
  'sysstat director',
  'sysmap nodes allcolumns',
  'sysmap nodes storage capacity',
];

function waitFor(stream, re, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    let buf = '';
    const t = setTimeout(() => {
      stream.removeListener('data', onData);
      reject(new Error(`Timeout. Buffer tail: ${buf.slice(-500)}`));
    }, timeoutMs);
    const onData = (data) => {
      buf += data.toString('utf8');
      if (re.test(buf)) {
        clearTimeout(t);
        stream.removeListener('data', onData);
        resolve(buf);
      }
    };
    stream.on('data', onData);
  });
}

function clean(raw) {
  return raw.replace(/\x1B\[[0-9;]*[A-Za-z]/g, '').replace(/\r/g, '');
}

const client = new Client();

client.on('keyboard-interactive', (_n, _i, _l, prompts, finish) => {
  finish(prompts.map(() => ''));
});

client.on('ready', () => {
  client.shell({ term: 'dumb' }, async (err, stream) => {
    if (err) { console.error(err); process.exit(1); }

    await waitFor(stream, SHELL_RE);
    stream.write('pancli\n');
    await waitFor(stream, PANCLI_RE);

    for (const cmd of commands) {
      console.log(`\n${'='.repeat(70)}`);
      console.log(`=== ${cmd} ===`);
      console.log('='.repeat(70));
      stream.write(cmd + '\n');
      try {
        const output = await waitFor(stream, PANCLI_RE, 60000);
        const cleaned = clean(output);
        // Only show first 80 lines to keep output manageable
        const lines = cleaned.split('\n');
        if (lines.length > 80) {
          console.log(lines.slice(0, 80).join('\n'));
          console.log(`... (${lines.length - 80} more lines)`);
        } else {
          console.log(cleaned);
        }
      } catch (e) {
        console.error(`FAILED: ${e.message}`);
      }
    }

    client.end();
    process.exit(0);
  });
});

client.on('error', (err) => {
  console.error('SSH Error:', err.message);
  process.exit(1);
});

client.connect({
  host: '10.97.104.11', port: 22, username: 'root', password: '',
  tryKeyboard: true, readyTimeout: 10000,
  algorithms: {
    kex: ['ecdh-sha2-nistp256','ecdh-sha2-nistp384','ecdh-sha2-nistp521','diffie-hellman-group-exchange-sha256','diffie-hellman-group14-sha256','diffie-hellman-group14-sha1','diffie-hellman-group1-sha1'],
    cipher: ['aes128-ctr','aes192-ctr','aes256-ctr','aes128-gcm','aes128-gcm@openssh.com','aes256-gcm','aes256-gcm@openssh.com','aes256-cbc','aes128-cbc'],
    serverHostKey: ['ssh-rsa','ecdsa-sha2-nistp256','ecdsa-sha2-nistp384','ecdsa-sha2-nistp521','rsa-sha2-512','rsa-sha2-256','ssh-ed25519'],
    hmac: ['hmac-sha2-256','hmac-sha2-512','hmac-sha1'],
  },
});
