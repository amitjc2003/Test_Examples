import * as XLSX from 'xlsx';

export interface Transaction {
  id: string;
  items: string[];
}

export interface Rule {
  antecedent: string;
  consequent: string;
  support: number;
  confidence: number;
  lift: number;
  coOccurrences: number;
}

export function parseExcel(file: File): Promise<Transaction[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        if (json.length === 0) return resolve([]);

        const keys = Object.keys(json[0] as object);
        
        // Simple heuristic to find Transaction ID and Item Name columns
        let txCol = keys[0];
        let itemCol = keys.length > 1 ? keys[1] : keys[0];

        for (const key of keys) {
          const lower = key.toLowerCase();
          if (lower.includes('id') || lower.includes('transaction') || lower.includes('order') || lower.includes('receipt')) {
            txCol = key;
          }
          if (lower.includes('item') || lower.includes('product') || lower.includes('name') || lower.includes('sku')) {
            itemCol = key;
          }
        }

        const txMap: Record<string, Set<string>> = {};
        for (const row of json as any[]) {
          const txId = String(row[txCol]).trim();
          const rawItems = String(row[itemCol]).trim();
          
          if (txId && rawItems && rawItems !== 'undefined' && rawItems !== 'null') {
            if (!txMap[txId]) txMap[txId] = new Set();
            
            // Split by comma to handle formats like "Fish, Pasta" or "Fish, Milk, Pasta"
            const items = rawItems.split(',').map(i => i.trim()).filter(i => i.length > 0);
            
            for (const item of items) {
              // Normalize to Title Case for consistency
              const normalizedItem = item.charAt(0).toUpperCase() + item.slice(1).toLowerCase();
              txMap[txId].add(normalizedItem);
            }
          }
        }

        const transactions: Transaction[] = Object.entries(txMap).map(([id, items]) => ({
          id,
          items: Array.from(items),
        }));

        resolve(transactions);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export function calculateMBA(transactions: Transaction[], minSupport = 0.001): Rule[] {
  const totalTransactions = transactions.length;
  if (totalTransactions === 0) return [];

  const itemCounts: Record<string, number> = {};
  const pairCounts: Record<string, number> = {};

  // Count 1-itemsets and 2-itemsets
  for (const tx of transactions) {
    const items = tx.items;
    for (let i = 0; i < items.length; i++) {
      const itemA = items[i];
      itemCounts[itemA] = (itemCounts[itemA] || 0) + 1;

      for (let j = i + 1; j < items.length; j++) {
        const itemB = items[j];
        // Create a consistent pair key
        const pair = [itemA, itemB].sort().join('|||');
        pairCounts[pair] = (pairCounts[pair] || 0) + 1;
      }
    }
  }

  const rules: Rule[] = [];

  // Generate rules
  for (const [pair, count] of Object.entries(pairCounts)) {
    const supportPair = count / totalTransactions;

    if (supportPair >= minSupport) {
      const [itemA, itemB] = pair.split('|||');
      const supportA = itemCounts[itemA] / totalTransactions;
      const supportB = itemCounts[itemB] / totalTransactions;

      // Rule A -> B
      rules.push({
        antecedent: itemA,
        consequent: itemB,
        support: supportPair,
        confidence: count / itemCounts[itemA],
        lift: supportPair / (supportA * supportB),
        coOccurrences: count,
      });

      // Rule B -> A
      rules.push({
        antecedent: itemB,
        consequent: itemA,
        support: supportPair,
        confidence: count / itemCounts[itemB],
        lift: supportPair / (supportB * supportA),
        coOccurrences: count,
      });
    }
  }

  return rules;
}
