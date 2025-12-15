"""
CICS 628 - Cryptography with Number Theory
Secure Medical Records Exchange System using DES-RSA Hybrid Cryptography
"""

from Crypto.Cipher import DES, PKCS1_OAEP
from Crypto.PublicKey import RSA
from Crypto.Random import get_random_bytes
from Crypto.Util.Padding import pad, unpad
import base64


class RSAKeyManager:
    def __init__(self, key_size=2048):
        self.key_size = key_size
        self.public_key = None
        self.private_key = None

    def generate_keys(self):
        print(f"\n{'=' * 60}")
        print("RSA KEY GENERATION (Mathematical Foundation)")
        print(f"{'=' * 60}")

        # Generate RSA key pair
        self.key_pair = RSA.generate(self.key_size)
        self.private_key = self.key_pair
        self.public_key = self.key_pair.publickey()

        # Extract mathematical components for demonstration
        n = self.private_key.n
        e = self.private_key.e
        d = self.private_key.d
        p = self.private_key.p
        q = self.private_key.q

        phi_n = (p - 1) * (q - 1)

        print(f"Prime p (first 20 digits): {str(p)[:20]}...")
        print(f"Prime q (first 20 digits): {str(q)[:20]}...")
        print(f"Modulus n (p*q): {str(n)[:20]}...")
        print(f"Public Exponent e: {e}")
        print(f"Private Exponent d (first 20 digits): {str(d)[:20]}...")
        print(f"Verification: (e * d) mod phi(n) = {(e * d) % phi_n}")

        return {
            'public_key': self.public_key,
            'private_key': self.private_key
        }

    def encrypt_with_public_key(self, data):
        cipher = PKCS1_OAEP.new(self.public_key)
        return cipher.encrypt(data)

    def decrypt_with_private_key(self, encrypted_data):
        cipher = PKCS1_OAEP.new(self.private_key)
        return cipher.decrypt(encrypted_data)


class DESEncryption:
    def __init__(self):
        self.key = None
        self.mode = DES.MODE_CBC

    def generate_key(self):
        self.key = get_random_bytes(8)  # DES uses 8 bytes (64 bits)
        return self.key

    def encrypt(self, plaintext):
        if isinstance(plaintext, str):
            plaintext = plaintext.encode('utf-8')

        # Pad to 8 bytes
        padded_text = pad(plaintext, DES.block_size)
        iv = get_random_bytes(DES.block_size)

        cipher = DES.new(self.key, self.mode, iv)
        ciphertext = cipher.encrypt(padded_text)

        return {'ciphertext': ciphertext, 'iv': iv}

    def decrypt(self, ciphertext, iv):
        cipher = DES.new(self.key, self.mode, iv)
        padded_text = cipher.decrypt(ciphertext)
        return unpad(padded_text, DES.block_size).decode('utf-8')


class HybridCryptosystem:
    def __init__(self):
        self.rsa = RSAKeyManager()
        self.des = DESEncryption()

    def run_simulation(self):
        # 1. Setup Keys
        keys = self.rsa.generate_keys()
        receiver_pub = keys['public_key']
        receiver_priv = keys['private_key']

        # 2. Define Medical Record
        record = "Patient: Kwame Mensah | Diagnosis: Type 2 Diabetes | ID: GH-4582"
        print(f"\nOriginal Record: {record}")

        # 3. Sender Encrypts
        print("\n--- Encryption Phase (Sender) ---")
        # A. Generate DES Session Key
        session_key = self.des.generate_key()
        print(f"Generated DES Session Key: {session_key.hex()}")

        # B. Encrypt Data with DES
        encrypted_data = self.des.encrypt(record)

        # C. Encrypt DES Key with RSA
        temp_rsa = RSAKeyManager()
        temp_rsa.public_key = receiver_pub
        encrypted_session_key = temp_rsa.encrypt_with_public_key(session_key)

        print(f"Encrypted Medical Record (Hex): {encrypted_data['ciphertext'].hex()[:30]}...")
        print(f"Encrypted Session Key (Len): {len(encrypted_session_key)} bytes")

        # 4. Transmission
        package = {
            'data': encrypted_data,
            'enc_key': encrypted_session_key
        }

        # 5. Receiver Decrypts
        print("\n--- Decryption Phase (Receiver) ---")

        # A. Decrypt Session Key using RSA Private Key
        temp_rsa.private_key = receiver_priv
        recovered_session_key = temp_rsa.decrypt_with_private_key(package['enc_key'])
        print(f"Recovered DES Key: {recovered_session_key.hex()}")

        # B. Decrypt Data using recovered DES Key
        self.des.key = recovered_session_key
        recovered_record = self.des.decrypt(
            package['data']['ciphertext'],
            package['data']['iv']
        )

        print(f"Recovered Record: {recovered_record}")

        if recovered_record == record:
            print("\n[SUCCESS] Decryption successful. Integrity verified.")
        else:
            print("\n[ERROR] Decryption failed.")


if __name__ == "__main__":
    system = HybridCryptosystem()
    system.run_simulation()