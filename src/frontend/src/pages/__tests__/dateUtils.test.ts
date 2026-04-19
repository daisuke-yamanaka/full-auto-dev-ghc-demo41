import { describe, it, expect } from 'vitest'
import { formatDate, formatDateTime, formatRelative, isOverdue, isDueSoon } from '../../utils/dateUtils'

describe('dateUtils', () => {
  describe('formatDate', () => {
    it('returns empty string for null/undefined', () => {
      expect(formatDate(null)).toBe('')
      expect(formatDate(undefined)).toBe('')
      expect(formatDate('')).toBe('')
    })

    it('formats date string to Japanese locale', () => {
      const result = formatDate('2024-01-15')
      expect(result).toMatch(/2024/)
      expect(result).toMatch(/01/)
      expect(result).toMatch(/15/)
    })
  })

  describe('formatDateTime', () => {
    it('returns empty string for null/undefined', () => {
      expect(formatDateTime(null)).toBe('')
      expect(formatDateTime(undefined)).toBe('')
    })

    it('formats datetime string to Japanese locale', () => {
      const result = formatDateTime('2024-01-15T10:30:00')
      expect(result).toMatch(/2024/)
      expect(result).toMatch(/10/)
    })
  })

  describe('formatRelative', () => {
    it('returns empty string for null/undefined', () => {
      expect(formatRelative(null)).toBe('')
      expect(formatRelative(undefined)).toBe('')
    })

    it('returns "たった今" for dates less than 1 minute ago', () => {
      const now = new Date()
      now.setSeconds(now.getSeconds() - 30)
      expect(formatRelative(now.toISOString())).toBe('たった今')
    })

    it('returns minutes ago for dates less than 60 minutes ago', () => {
      const now = new Date()
      now.setMinutes(now.getMinutes() - 30)
      const result = formatRelative(now.toISOString())
      expect(result).toMatch(/分前/)
    })

    it('returns hours ago for dates less than 24 hours ago', () => {
      const now = new Date()
      now.setHours(now.getHours() - 5)
      const result = formatRelative(now.toISOString())
      expect(result).toMatch(/時間前/)
    })

    it('returns "昨日" for dates exactly 1 day ago', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      yesterday.setHours(yesterday.getHours() - 1)
      const result = formatRelative(yesterday.toISOString())
      expect(result).toBe('昨日')
    })

    it('returns days ago for dates less than 7 days ago', () => {
      const daysAgo = new Date()
      daysAgo.setDate(daysAgo.getDate() - 3)
      daysAgo.setHours(daysAgo.getHours() - 1)
      const result = formatRelative(daysAgo.toISOString())
      expect(result).toMatch(/日前/)
    })

    it('returns formatted date for dates 7+ days ago', () => {
      const longAgo = new Date()
      longAgo.setDate(longAgo.getDate() - 10)
      const result = formatRelative(longAgo.toISOString())
      expect(result).toMatch(/2\d{3}/)
    })
  })

  describe('isOverdue', () => {
    it('returns true for past date', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      expect(isOverdue(yesterday.toISOString())).toBe(true)
    })

    it('returns false for future date', () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      expect(isOverdue(tomorrow.toISOString())).toBe(false)
    })
  })

  describe('isDueSoon', () => {
    it('returns true for date within threshold', () => {
      const soon = new Date()
      soon.setDate(soon.getDate() + 2)
      expect(isDueSoon(soon.toISOString(), 3)).toBe(true)
    })

    it('returns false for date beyond threshold', () => {
      const far = new Date()
      far.setDate(far.getDate() + 10)
      expect(isDueSoon(far.toISOString(), 3)).toBe(false)
    })

    it('returns false for past date', () => {
      const past = new Date()
      past.setDate(past.getDate() - 1)
      expect(isDueSoon(past.toISOString())).toBe(false)
    })
  })
})
