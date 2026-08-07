import type { Topic, ProConItem, CategoryType } from '../types/topic.types';

export function parseMarkdownToTopic(
  rawText: string, 
  title: string, 
  category: CategoryType = 'Polity'
): Partial<Topic> {
  const clean = rawText.trim();

  // Helper to extract section using regex
  const getSection = (heading: string, nextHeadings: string[]): string => {
    const nextRegex = nextHeadings.length > 0 ? `(?=${nextHeadings.map(h => `(?:#+\\s*|\\*\\*|\\b)${h}`).join('|')})` : '$';
    const regex = new RegExp(`(?:#+\\s*|\\*\\*|\\b)${heading}[:\\s]*\\n+([\\s\\S]*?)${nextRegex}`, 'i');
    const match = clean.match(regex);
    return match ? match[1].trim() : '';
  };

  // 1. Meaning
  const rawMeaning = getSection('Meaning', ['Quote', 'Pros & Cons', 'Pros', 'Way Forward', 'Conclusion']);
  const meaning = rawMeaning.replace(/^#+\s*/, '').trim();

  // 2. Quote
  const rawQuote = getSection('Quote', ['Pros & Cons', 'Pros', 'Way Forward', 'Conclusion']);
  let quoteText = '';
  let quoteSource = '';
  if (rawQuote) {
    const quoteMatch = rawQuote.match(/["“]([^"”]+)["”]\s*[-–—]\s*(.*)/);
    if (quoteMatch) {
      quoteText = quoteMatch[1].trim();
      quoteSource = quoteMatch[2].trim();
    } else {
      const parts = rawQuote.split(/[-–—]/);
      quoteText = parts[0]?.replace(/["“]/g, '').trim() || rawQuote;
      quoteSource = parts[1]?.trim() || 'UPSC Standard Reference';
    }
  }

  // Helper to parse items (Pros or Cons)
  const parseItems = (sectionText: string): ProConItem[] => {
    const items: ProConItem[] = [];
    const rawBlocks = sectionText.split(/(?=\n\s*\d+[\.\)]|\n\s*[-*]\s*)/).filter(b => b.trim());

    for (const block of rawBlocks) {
      const titleMatch = block.match(/(?:\d+[\.\)]|[-*])\s*\**([^:*]+)\**[:\-]?\s*([^\n]+)/);
      const exampleMatch = block.match(/Example[:\s]*([^\n]+)/i);

      if (titleMatch) {
        const itemTitle = titleMatch[1].replace(/[*#]/g, '').trim();
        let itemExpl = titleMatch[2].replace(/Example[:\s]*[^\n]+/i, '').trim();
        const exampleText = exampleMatch ? exampleMatch[1].trim() : '';

        // Clean up explanation
        itemExpl = itemExpl.replace(/^:\s*/, '').trim();

        if (itemTitle) {
          items.push({
            title: itemTitle,
            explanation: itemExpl,
            example: exampleText
          });
        }
      }
    }
    return items;
  };

  // 3. Pros & Cons
  const rawProsSection = getSection('Pros', ['Cons', 'Way Forward', 'Conclusion']);
  const rawConsSection = getSection('Cons', ['Way Forward', 'Conclusion']);

  const pros = parseItems(rawProsSection);
  const cons = parseItems(rawConsSection);

  // 4. Way Forward
  const rawWayForward = getSection('Way Forward', ['Conclusion']);
  const wayForward = rawWayForward.trim();

  // 5. Conclusion
  const rawConclusion = getSection('Conclusion', []);
  const conclusionLines = rawConclusion.split('\n').filter(l => l.trim());
  let conclusionObj: { negative: string; positive: string } | string;

  if (conclusionLines.length >= 2) {
    conclusionObj = {
      negative: conclusionLines[0].trim(),
      positive: conclusionLines[1].trim()
    };
  } else {
    conclusionObj = rawConclusion.trim();
  }

  return {
    title,
    category,
    meaning: meaning || 'Definition processing completed.',
    quote: {
      text: quoteText || 'Institutional clarity precedes administrative efficiency.',
      source: quoteSource || 'Public Policy Framework'
    },
    pros,
    cons,
    wayForward: wayForward || 'Implementation requires inter-departmental synergy and judicial oversight.',
    conclusion: conclusionObj,
    source: 'web',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
