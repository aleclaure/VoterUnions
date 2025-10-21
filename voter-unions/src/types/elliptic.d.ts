/**
 * TypeScript declarations for elliptic library
 *
 * Provides type safety for ECDSA cryptographic operations
 */

declare module 'elliptic' {
  /**
   * Elliptic Curve instance
   */
  export class ec {
    /**
     * Create an elliptic curve instance
     * @param curveName - Name of the curve (e.g., 'p256', 'secp256k1')
     */
    constructor(curveName: string);

    /**
     * Generate a new keypair
     * @returns KeyPair instance
     */
    genKeyPair(): KeyPair;

    /**
     * Create a keypair from a private key
     * @param privateKey - Private key as hex string or buffer
     * @param encoding - Encoding format ('hex' or 'buffer')
     * @returns KeyPair instance
     */
    keyFromPrivate(privateKey: string | Buffer, encoding?: 'hex' | 'buffer'): KeyPair;

    /**
     * Create a keypair from a public key
     * @param publicKey - Public key as hex string or buffer
     * @param encoding - Encoding format ('hex' or 'buffer')
     * @returns KeyPair instance
     */
    keyFromPublic(publicKey: string | Buffer, encoding?: 'hex' | 'buffer'): KeyPair;
  }

  /**
   * Elliptic Curve KeyPair
   */
  export interface KeyPair {
    /**
     * Get the private key
     * @param encoding - Output encoding ('hex' or 'buffer')
     * @returns Private key in specified encoding
     */
    getPrivate(encoding?: 'hex'): string;
    getPrivate(encoding: 'buffer'): Buffer;

    /**
     * Get the public key
     * @param encoding - Output encoding ('hex' or 'buffer')
     * @returns Public key in specified encoding
     */
    getPublic(encoding?: 'hex'): string;
    getPublic(encoding: 'buffer'): Buffer;

    /**
     * Sign a message hash
     * @param message - Message to sign (will be hashed internally)
     * @param options - Signing options
     * @returns Signature instance
     */
    sign(message: string | Buffer, options?: SignOptions): Signature;

    /**
     * Verify a signature
     * @param message - Original message
     * @param signature - Signature to verify (hex string or Signature instance)
     * @returns true if signature is valid
     */
    verify(message: string | Buffer, signature: string | Signature): boolean;
  }

  /**
   * Signature options
   */
  export interface SignOptions {
    /**
     * Additional entropy for signature
     */
    k?: string | Buffer;
    /**
     * Use canonical signature format
     */
    canonical?: boolean;
    /**
     * Persistent nonce (for deterministic signatures)
     */
    pers?: string | Buffer;
  }

  /**
   * ECDSA Signature
   */
  export interface Signature {
    /**
     * R component of signature
     */
    r: BN;

    /**
     * S component of signature
     */
    s: BN;

    /**
     * Recovery parameter
     */
    recoveryParam?: number;

    /**
     * Convert signature to DER format
     * @param encoding - Output encoding ('hex' or 'buffer')
     * @returns Signature in DER format
     */
    toDER(encoding?: 'hex'): string;
    toDER(encoding: 'buffer'): Buffer;
  }

  /**
   * Big Number (from bn.js)
   */
  export interface BN {
    /**
     * Convert to string
     * @param base - Numeric base (default 10)
     * @param length - Minimum length with zero padding
     */
    toString(base?: number, length?: number): string;

    /**
     * Convert to Buffer
     * @param endian - Endianness ('be' or 'le')
     * @param length - Buffer length
     */
    toBuffer(endian?: 'be' | 'le', length?: number): Buffer;
  }
}
