/**
 * Tests for Amazon Marketplace Linking Filter
 * RED PHASE: Define expected behavior for identifying linkable Amazon transactions
 */

import { isLinkableAmazonTransaction } from '../amazonLinkingFilter'

describe('isLinkableAmazonTransaction', () => {
  describe('Valid marketplace transactions (should link)', () => {
    it('should identify AMAZON MKTPL with asterisk and code', () => {
      expect(isLinkableAmazonTransaction('AMAZON MKTPL*NM9QH43N0')).toBe(true)
    })

    it('should identify Amazon.com with asterisk and code', () => {
      expect(isLinkableAmazonTransaction('Amazon.com*NU7SY9GM0')).toBe(true)
    })

    it('should identify AMZN MKTP with asterisk and code', () => {
      expect(isLinkableAmazonTransaction('AMZN MKTP US*AB1CD2EF3')).toBe(true)
    })

    it('should handle different case variations', () => {
      expect(isLinkableAmazonTransaction('amazon mktpl*xyz123456')).toBe(true)
      expect(isLinkableAmazonTransaction('AMAZON.COM*ABC123456')).toBe(true)
    })
  })

  describe('Non-marketplace transactions (should NOT link)', () => {
    it('should reject Amazon Grocery Subscription', () => {
      expect(isLinkableAmazonTransaction('Amazon Grocery Subscri')).toBe(false)
    })

    it('should reject AMAZON PRIME', () => {
      expect(isLinkableAmazonTransaction('AMAZON PRIME*NF42D07L1')).toBe(false)
    })

    it('should reject Amazon Prime variations', () => {
      expect(isLinkableAmazonTransaction('AMAZON PRIME')).toBe(false)
      expect(isLinkableAmazonTransaction('Amazon Prime Membership')).toBe(false)
    })

    it('should reject Amazon Music', () => {
      expect(isLinkableAmazonTransaction('AMAZON MUSIC')).toBe(false)
    })

    it('should reject Amazon Digital Services', () => {
      expect(isLinkableAmazonTransaction('AMAZON DIGITAL SVCS')).toBe(false)
    })

    it('should reject Prime Video', () => {
      expect(isLinkableAmazonTransaction('PRIME VIDEO*MEMBERSHIP')).toBe(false)
    })

    it('should reject Amazon Web Services', () => {
      expect(isLinkableAmazonTransaction('AWS')).toBe(false)
      expect(isLinkableAmazonTransaction('Amazon Web Services')).toBe(false)
    })

    it('should reject exact "Amazon" (line items)', () => {
      expect(isLinkableAmazonTransaction('Amazon')).toBe(false)
    })

    it('should reject non-Amazon merchants', () => {
      expect(isLinkableAmazonTransaction('Walmart')).toBe(false)
      expect(isLinkableAmazonTransaction('Target')).toBe(false)
    })

    it('should reject empty or null values', () => {
      expect(isLinkableAmazonTransaction('')).toBe(false)
      expect(isLinkableAmazonTransaction('  ')).toBe(false)
    })
  })

  describe('Edge cases', () => {
    it('should require asterisk AND code for marketplace transactions', () => {
      // Has "MKTPL" but no asterisk+code
      expect(isLinkableAmazonTransaction('AMAZON MKTPL')).toBe(false)

      // Has asterisk but no code
      expect(isLinkableAmazonTransaction('AMAZON MKTPL*')).toBe(false)
    })

    it('should handle transactions with multiple asterisks', () => {
      expect(isLinkableAmazonTransaction('AMAZON MKTPL*CODE123*EXTRA')).toBe(true)
    })
  })
})
