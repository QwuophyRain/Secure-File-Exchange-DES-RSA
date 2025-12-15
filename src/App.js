import React, { useState } from 'react';
// Added more medical icons for the background
import { Lock, Unlock, FileText, Key, Shield, AlertCircle, CheckCircle, Stethoscope, Syringe, Thermometer, Activity, Pill, HeartPulse } from 'lucide-react';

// --- Mathematical Helper Functions (Unchanged) ---

const modInverse = (a, m) => {
  let [old_r, r] = [a, m];
  let [old_s, s] = [1, 0];

  while (r !== 0) {
    const quotient = Math.floor(old_r / r);
    [old_r, r] = [r, old_r - quotient * r];
    [old_s, s] = [s, old_s - quotient * s];
  }

  return old_s < 0 ? old_s + m : old_s;
};

const modPow = (base, exp, mod) => {
  let result = 1;
  base = base % mod;
  while (exp > 0) {
    if (exp % 2 === 1) result = (result * base) % mod;
    exp = Math.floor(exp / 2);
    base = (base * base) % mod;
  }
  return result;
};

const simplifiedDES = (text, key, encrypt = true) => {
  const rounds = 16;
  let result = '';

  for (let i = 0; i < text.length; i++) {
    let charCode = text.charCodeAt(i);
    for (let round = 0; round < rounds; round++) {
      const roundKey = (key + round) % 256;
      charCode = charCode ^ roundKey;
    }
    result += String.fromCharCode(charCode);
  }
  return result;
};

// --- New Component: Floating Background Icons ---
const FloatingBackground = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
    {/* Stethoscopes */}
    <Stethoscope className="absolute top-10 left-10 w-24 h-24 text-red-200 animate-float" />
    <Stethoscope className="absolute bottom-20 right-20 w-32 h-32 text-red-100 animate-float delay-2000" />

    {/* Syringes */}
    <Syringe className="absolute top-1/4 right-10 w-20 h-20 text-red-200 animate-float delay-1000" style={{transform: 'rotate(45deg)'}} />
    <Syringe className="absolute bottom-1/3 left-20 w-16 h-16 text-red-100 animate-float delay-3000" style={{transform: 'rotate(-15deg)'}} />

    {/* BP / Activity */}
    <Activity className="absolute top-1/3 left-1/3 w-28 h-28 text-red-50 animate-float delay-4000" />
    <HeartPulse className="absolute bottom-10 left-1/2 w-24 h-24 text-red-200 animate-float" />

    {/* Misc */}
    <Thermometer className="absolute top-20 right-1/3 w-16 h-16 text-red-100 animate-float delay-2000" />
    <Pill className="absolute bottom-1/4 right-1/4 w-12 h-12 text-red-200 animate-float delay-1000" />
  </div>
);


const App = () => {
  const [activeTab, setActiveTab] = useState('encrypt');
  const [plaintext, setPlaintext] = useState('');
  const [encryptedData, setEncryptedData] = useState(null);
  const [decryptedText, setDecryptedText] = useState('');
  const [logs, setLogs] = useState([]);
  const [showMath, setShowMath] = useState(false);

  // --- Cryptographic Logic (Unchanged) ---

  const generateRSAKeys = () => {
    const p = 61;
    const q = 53;
    const n = p * q;
    const phi = (p - 1) * (q - 1);
    const e = 17;
    const d = modInverse(e, phi);

    return {
      publicKey: { e, n },
      privateKey: { d, n },
      p, q, phi
    };
  };

  const rsaEncrypt = (message, key) => {
    const exp = key.e || key.d;
    const n = key.n;
    const encrypted = [];
    for (let i = 0; i < message.length; i++) {
      const charCode = message.charCodeAt(i);
      if (charCode >= n) {
        encrypted.push(charCode);
      } else {
        encrypted.push(modPow(charCode, exp, n));
      }
    }
    return encrypted;
  };

  const rsaDecrypt = (encrypted, key) => {
    const exp = key.d || key.e;
    const n = key.n;
    let decrypted = '';
    for (let i = 0; i < encrypted.length; i++) {
      const charCode = encrypted[i];
      if (charCode >= n) {
        decrypted += String.fromCharCode(charCode);
      } else {
        decrypted += String.fromCharCode(modPow(charCode, exp, n));
      }
    }
    return decrypted;
  };

  // --- UI Handlers ---

  const addLog = (message, type = 'info') => {
    setLogs(prev => [...prev, { message, type, time: new Date().toLocaleTimeString() }]);
  };

  const handleEncrypt = () => {
    if (!plaintext.trim()) {
      addLog('Please enter medical record data to encrypt', 'error');
      return;
    }

    setLogs([]);
    addLog('Starting hybrid encryption process...', 'info');

    // 1. Generate RSA Keys
    const keys = generateRSAKeys();
    addLog(`RSA Keys Generated: p=${keys.p}, q=${keys.q}, n=${keys.publicKey.n}`, 'success');
    addLog(`Public Key (e,n): (${keys.publicKey.e}, ${keys.publicKey.n})`, 'success');

    // 2. Generate DES Session Key
    const desKey = Math.floor(Math.random() * 255) + 1;
    addLog(`DES Session Key Generated: ${desKey}`, 'success');

    // 3. Encrypt Data with DES
    const desCiphertext = simplifiedDES(plaintext, desKey, true);
    addLog('Medical record encrypted with DES', 'success');

    // 4. Encrypt DES Key with RSA
    const encryptedDesKey = rsaEncrypt(desKey.toString(), keys.publicKey);
    addLog('DES key encrypted with RSA public key', 'success');

    // 5. Digital Signature
    const signatureSource = plaintext.substring(0, 10);
    const signature = rsaEncrypt(signatureSource, keys.privateKey);
    addLog('Digital signature created (Signed with Private Key)', 'success');

    setEncryptedData({
      ciphertext: Array.from(desCiphertext).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(''),
      encryptedKey: encryptedDesKey,
      signature: signature,
      keys: keys,
      originalDesKey: desKey,
      signatureSource: signatureSource
    });

    addLog('Encryption complete! Data ready for transmission', 'success');
  };

  const handleDecrypt = () => {
    if (!encryptedData) {
      addLog('No encrypted data found.', 'error');
      return;
    }

    addLog('Starting decryption process...', 'info');

    // 1. Decrypt DES key using RSA Private Key
    const decryptedKeyStr = rsaDecrypt(encryptedData.encryptedKey, encryptedData.keys.privateKey);
    const recoveredDesKey = parseInt(decryptedKeyStr, 10);
    addLog(`DES key recovered: ${recoveredDesKey}`, 'success');

    // 2. Convert Hex to String
    const ciphertextString = encryptedData.ciphertext.match(/.{2}/g)
      .map(hex => String.fromCharCode(parseInt(hex, 16)))
      .join('');

    // 3. Decrypt Data
    const decrypted = simplifiedDES(ciphertextString, recoveredDesKey, false);

    // 4. Verify Signature
    const verifiedSignature = rsaDecrypt(encryptedData.signature, encryptedData.keys.publicKey);
    const isValid = verifiedSignature === encryptedData.signatureSource;

    if (isValid) {
        addLog(`Digital signature VERIFIED ✓`, 'success');
        addLog('Medical record decrypted successfully', 'success');
        setDecryptedText(decrypted);
    } else {
        addLog(`Digital signature INVALID ✗`, 'error');
        addLog('Integrity check failed.', 'error');
    }
  };

  const getMathematicalDetails = () => {
    if (!encryptedData) return null;
    const { p, q, phi, publicKey, privateKey } = encryptedData.keys;

    // Updated colors to red theme
    return (
      <div className="bg-red-50 p-4 rounded-lg mt-4 text-sm border border-red-200 shadow-sm">
        <h4 className="font-bold mb-2 text-red-900 flex items-center gap-2">
          <Activity className="w-4 h-4" /> Mathematical Foundation:
        </h4>
        <div className="space-y-1 text-red-800 font-mono text-xs">
          <p>• Primes: p={p}, q={q}</p>
          <p>• Modulus: n = p×q = {publicKey.n}</p>
          <p>• Totient: φ(n) = (p-1)(q-1) = {phi}</p>
          <p>• Public Key (e): {publicKey.e}</p>
          <p>• Private Key (d): {privateKey.d}</p>
          <p>• Proof: (e×d) mod φ(n) = 1</p>
          <div className="mt-2 pt-2 border-t border-red-200">
             <p>• DES Key (k): {encryptedData.originalDesKey}</p>
             <p>• RSA Encrypted Key (c): c = k^e mod n</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    // Updated background gradient to red/white
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-100 p-6 font-sans relative">
      <FloatingBackground />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header - Updated colors to red */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md border-t-4 border-red-600 p-6 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-red-100 rounded-lg shadow-inner">
                <Stethoscope className="w-8 h-8 text-red-600" />
            </div>
            <div>
                <h1 className="text-2xl font-extrabold text-gray-800">Secure Medical Records Exchange</h1>
                <p className="text-red-600 font-medium text-sm flex items-center gap-1">
                  <HeartPulse className="w-4 h-4" /> Hybrid Cryptosystem (RSA + DES)
                </p>
            </div>
          </div>
        </div>

        {/* Main Interface */}
        <div className="grid lg:grid-cols-2 gap-6">

          {/* Left Panel: Operations */}
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-md border border-red-100 p-6">
            <div className="flex bg-red-50 p-1 rounded-lg mb-6 border border-red-100">
              <button
                onClick={() => setActiveTab('encrypt')}
                // Updated active state color to red
                className={`flex-1 py-2 px-4 rounded-md text-sm font-bold transition-all ${
                  activeTab === 'encrypt' ? 'bg-white text-red-600 shadow-md' : 'text-gray-600 hover:text-red-500'
                }`}
              >
                <Lock className="w-4 h-4 inline mr-2" /> Encrypt
              </button>
              <button
                onClick={() => setActiveTab('decrypt')}
                // Kept decrypt green for success/go signal contrast
                className={`flex-1 py-2 px-4 rounded-md text-sm font-bold transition-all ${
                  activeTab === 'decrypt' ? 'bg-white text-green-600 shadow-md' : 'text-gray-600 hover:text-green-500'
                }`}
              >
                <Unlock className="w-4 h-4 inline mr-2" /> Decrypt
              </button>
            </div>

            {activeTab === 'encrypt' ? (
              <div className="space-y-4 animate-fadeIn">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    <FileText className="w-4 h-4 inline mr-1 text-red-500" /> Input Medical Record
                  </label>
                  <textarea
                    value={plaintext}
                    onChange={(e) => setPlaintext(e.target.value)}
                    placeholder="Patient Name: ...&#10;Diagnosis: ...&#10;Prescription: ..."
                    // Updated focus ring to red
                    className="w-full h-40 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono text-sm shadow-sm"
                  />
                </div>
                <button
                  onClick={handleEncrypt}
                  // Updated button to red theme
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-3 rounded-lg transition transform hover:scale-[1.02] flex items-center justify-center gap-2 shadow-md"
                >
                  <Shield className="w-5 h-5" /> Encrypt & Sign Record
                </button>

                {encryptedData && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border-2 border-red-100 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                    <div className="flex justify-between items-center mb-2 pl-2">
                        <span className="text-xs font-bold text-red-700 uppercase flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Encrypted Output
                        </span>
                        <button onClick={() => setShowMath(!showMath)} className="text-xs text-red-600 hover:underline font-medium">
                            {showMath ? 'Hide Details' : 'Show Math'}
                        </button>
                    </div>
                    <p className="font-mono text-xs break-all text-gray-600 bg-white p-3 rounded border shadow-inner pl-4">
                      {encryptedData.ciphertext.substring(0, 60)}...
                    </p>
                    {showMath && getMathematicalDetails()}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4 animate-fadeIn">
                <div className="bg-amber-50 border-l-4 border-amber-400 rounded-r-lg p-4 shadow-sm">
                  <p className="text-sm text-amber-800 flex gap-2 font-medium">
                    <Key className="w-5 h-5 shrink-0 text-amber-500" />
                    Decryption requires the private key to securely recover the session key.
                  </p>
                </div>
                <button
                  onClick={handleDecrypt}
                  disabled={!encryptedData}
                  // Kept decrypt green for success contrast
                  className={`w-full py-3 rounded-lg font-bold transition transform hover:scale-[1.02] flex items-center justify-center gap-2 shadow-md ${
                    encryptedData ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Unlock className="w-5 h-5" /> Decrypt & Verify Signature
                </button>

                {decryptedText && (
                  <div className="mt-4">
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      <CheckCircle className="w-4 h-4 inline mr-1 text-green-600" /> Recovered & Verified Data
                    </label>
                    <textarea
                      value={decryptedText}
                      readOnly
                      className="w-full h-40 p-3 border-2 border-green-200 rounded-lg bg-green-50/50 text-green-900 font-mono text-sm shadow-inner"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Panel: Logs - Kept dark for contrast, but added red accents */}
          <div className="bg-gray-900 rounded-xl shadow-xl border-t-4 border-red-600 p-6 flex flex-col h-[650px]">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2 uppercase tracking-wider">
              <Activity className="w-5 h-5 text-red-500" /> System Activity Log
            </h3>
            <div className="flex-1 overflow-y-auto space-y-2 font-mono text-xs pr-2 custom-scrollbar bg-gray-950/50 p-4 rounded-lg inner-shadow">
              {logs.length === 0 ? (
                <div className="text-gray-500 italic text-center mt-20 flex flex-col items-center">
                  <Shield className="w-10 h-10 text-gray-700 mb-2" />
                  System secure. Waiting for input...
                </div>
              ) : (
                logs.map((log, idx) => (
                  <div key={idx} className="flex gap-2 border-l-2 border-gray-700 pl-2 py-1">
                    <span className="text-gray-500 shrink-0">[{log.time}]</span>
                    <span className={`${
                      log.type === 'error' ? 'text-red-400 font-bold' : 
                      log.type === 'success' ? 'text-green-400 font-medium' : 'text-blue-300'
                    }`}>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
            </div>
            <button
              onClick={() => setLogs([])}
              className="mt-4 w-full bg-gray-800 hover:bg-gray-700 text-red-400 hover:text-red-300 text-xs font-bold py-3 rounded-lg transition uppercase tracking-wider border border-gray-700"
            >
              Clear System Logs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;