/**
 * Client-side NLP parsing for expense entry.
 * Uses regex and keyword matching against available categories.
 */
class NlpParser {
  constructor() {
    this.categories = [];
    this.keywordMap = {};
    this.paymentMethods = {
      'cash': 'Cash',
      'credit': 'Credit Card',
      'card': 'Credit Card', // default to credit if just 'card'
      'debit': 'Debit Card',
      'upi': 'UPI',
      'gpay': 'UPI',
      'phonepe': 'UPI',
      'paytm': 'UPI',
      'net banking': 'Net Banking',
      'transfer': 'Net Banking'
    };
  }

  setCategories(categories) {
    this.categories = categories;
    this.keywordMap = {};
    
    categories.forEach(cat => {
      // Map category name
      this.keywordMap[cat.name.toLowerCase()] = cat;
      
      // Map all keywords
      if (cat.keywords && Array.isArray(cat.keywords)) {
        cat.keywords.forEach(kw => {
          this.keywordMap[kw.toLowerCase()] = cat;
        });
      }
    });
  }

  parse(text) {
    if (!text || typeof text !== 'string') return null;
    
    text = text.toLowerCase().trim();
    
    const result = {
      amount: null,
      type: 'expense', // default
      category: null,
      paymentMethod: 'UPI', // default
      description: text, // default to full text
      confidence: 'low'
    };

    // 1. Extract Amount
    // Matches "150", "Rs 150", "₹150", "150.50", "paid 150"
    const amountRegex = /(?:rs\.?|₹|paid|spent|got)?\s*(\d+(?:\.\d{1,2})?)/;
    const amountMatch = text.match(amountRegex);
    if (amountMatch && amountMatch[1]) {
      result.amount = parseFloat(amountMatch[1]);
      // Remove amount and currency symbols from description
      result.description = result.description
        .replace(new RegExp(`(?:rs\\.?|₹|paid|spent|got)?\\s*${amountMatch[1]}`, 'i'), '')
        .trim();
    }

    // 2. Determine Type
    if (/\b(got|received|earned|salary|income)\b/.test(text)) {
      result.type = 'income';
    }

    // 3. Extract Payment Method
    for (const [key, value] of Object.entries(this.paymentMethods)) {
      if (text.includes(key)) {
        result.paymentMethod = value;
        // Remove payment method from description (e.g. "on card", "via upi")
        result.description = result.description
          .replace(new RegExp(`(?:on|via|using)?\\s*${key}`, 'i'), '')
          .trim();
        break;
      }
    }

    // 4. Extract Category (find longest matching keyword)
    let bestMatch = null;
    let matchLength = 0;
    
    // Sort keys by length descending to match longest phrases first
    const keywords = Object.keys(this.keywordMap).sort((a, b) => b.length - a.length);
    
    for (const keyword of keywords) {
      if (text.includes(keyword) && keyword.length > matchLength) {
        bestMatch = this.keywordMap[keyword].name;
        matchLength = keyword.length;
      }
    }

    if (bestMatch) {
      result.category = bestMatch;
      result.confidence = result.amount ? 'high' : 'medium';
      
      // Optionally remove category keyword from description if it makes sense
      // Usually better to leave it in description for context
    }

    // Clean up description
    result.description = result.description
      .replace(/^(for|on|at|to)\s+/i, '') // Remove leading prepositions
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();

    // Capitalize first letter of description
    if (result.description) {
      result.description = result.description.charAt(0).toUpperCase() + result.description.slice(1);
    }

    return result;
  }
}

window.nlpParser = new NlpParser();
