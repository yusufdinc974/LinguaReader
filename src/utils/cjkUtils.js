/**
 * CJK Language Utilities
 * Specialized utility functions for handling Chinese, Japanese, and Korean
 */

/**
 * Get JLPT level for a Japanese kanji
 * @param {string} kanji - Single kanji character
 * @returns {number|null} - JLPT level (1-5) or null if unknown
 */
export const getJLPTLevel = (kanji) => {
    // This is a simplified implementation
    // In a real app, you would have a database of JLPT levels for kanji
    
    // Sample JLPT N5 kanji (most basic)
    const jlptN5 = '日一人大年中子月本国長出三時行見前後午分';
    
    // Sample JLPT N4 kanji
    const jlptN4 = '会社同事自者間意地思家話作私世多力学目';
    
    // Sample JLPT N3 kanji
    const jlptN3 = '政議民連対部合市内相定回選米実関決全表戦経';
    
    // Sample JLPT N2 kanji
    const jlptN2 = '義議犯罪論争批判過程構成要素資本主義革命改革';
    
    // Sample JLPT N1 kanji (most advanced)
    const jlptN1 = '壊憂鬱艶麗璧瞭錯縫鎮痺餓傑債償募恩繰潔穫崇';
    
    if (jlptN5.includes(kanji)) return 5;
    if (jlptN4.includes(kanji)) return 4;
    if (jlptN3.includes(kanji)) return 3;
    if (jlptN2.includes(kanji)) return 2;
    if (jlptN1.includes(kanji)) return 1;
    
    return null;
  };
  
  /**
   * Get HSK level for a Chinese character
   * @param {string} hanzi - Single Chinese character
   * @returns {number|null} - HSK level (1-6) or null if unknown
   */
  export const getHSKLevel = (hanzi) => {
    // This is a simplified implementation
    // In a real app, you would have a database of HSK levels
    
    // Sample HSK 1 characters (most basic)
    const hsk1 = '人口日月水火山木土王田电';
    
    // Sample HSK 2 characters
    const hsk2 = '中文学生老师朋友身体家常高校';
    
    // Sample HSK 3 characters
    const hsk3 = '街市红绿蓝黑白医院眼睛鼻子';
    
    // Sample HSK 4 characters
    const hsk4 = '世界国家文化历史艺术科学知识';
    
    // Sample HSK 5 characters
    const hsk5 = '政府经济社会法律支持环境影响';
    
    // Sample HSK 6 characters (most advanced)
    const hsk6 = '抽象具体维护充分举例概念效率';
    
    if (hsk1.includes(hanzi)) return 1;
    if (hsk2.includes(hanzi)) return 2;
    if (hsk3.includes(hanzi)) return 3;
    if (hsk4.includes(hanzi)) return 4;
    if (hsk5.includes(hanzi)) return 5;
    if (hsk6.includes(hanzi)) return 6;
    
    return null;
  };
  
  /**
   * Get the radical components of a kanji/hanzi
   * @param {string} character - Single CJK character
   * @returns {Array<string>} - Array of radical components
   */
  export const getRadicals = (character) => {
    // This is a placeholder implementation
    // In a real app, you would use a database of radical components
    
    // Sample radical mappings for a few common characters
    const radicalMap = {
      '日': ['日'],
      '月': ['月'],
      '木': ['木'],
      '休': ['人', '木'],
      '明': ['日', '月'],
      '森': ['木', '木', '木'],
      '好': ['女', '子'],
      '妈': ['女', '马'],
      '江': ['水', '工'],
      '河': ['水', '可'],
      '湖': ['水', '胡'],
      '海': ['水', '每'],
      '语': ['讠', '吾'],
      '说': ['讠', '兑'],
      '话': ['讠', '舌']
    };
    
    return radicalMap[character] || [];
  };
  
  /**
   * Get stroke count for a CJK character
   * @param {string} character - Single CJK character
   * @returns {number|null} - Number of strokes or null if unknown
   */
  export const getStrokeCount = (character) => {
    // This is a placeholder implementation
    // In a real app, you would use a database of stroke counts
    
    // Sample stroke counts for common characters
    const strokeCounts = {
      '一': 1,
      '二': 2,
      '三': 3,
      '四': 5,
      '五': 4,
      '六': 4,
      '七': 2,
      '八': 2,
      '九': 2,
      '十': 2,
      '百': 6,
      '千': 3,
      '万': 3,
      '日': 4,
      '月': 4,
      '年': 6,
      '人': 2,
      '木': 4,
      '火': 4,
      '水': 4,
      '山': 3,
      '口': 3,
      '手': 4,
      '目': 5,
      '耳': 6,
      '鼻': 14,
      '田': 5,
      '心': 4,
      '思': 9,
      '想': 13,
      '言': 7,
      '語': 14,
      '文': 4,
      '字': 6,
      '学': 8,
      '校': 10,
      '店': 8,
      '買': 12,
      '売': 7,
      '読': 14,
      '書': 10,
      '好': 6,
      '朋': 8,
      '友': 4,
      '道': 12,
      '車': 7,
      '電': 13
    };
    
    return strokeCounts[character] || null;
  };
  
  /**
   * Convert between simplified and traditional Chinese characters
   * @param {string} text - Chinese text
   * @param {string} targetForm - Target form ('simplified' or 'traditional')
   * @returns {string} - Converted text
   */
  export const convertChineseForm = (text, targetForm) => {
    // This is a placeholder implementation
    // In a real app, you would use a comprehensive conversion dictionary
    
    // Sample conversion map (very limited)
    const simplifiedToTraditional = {
      '国': '國',
      '见': '見',
      '马': '馬',
      '鸟': '鳥',
      '书': '書',
      '车': '車',
      '龙': '龍',
      '学': '學',
      '习': '習',
      '语': '語',
      '气': '氣',
      '门': '門',
      '问': '問',
      '闻': '聞'
    };
    
    // Reverse map for traditional to simplified
    const traditionalToSimplified = {};
    for (const [simplified, traditional] of Object.entries(simplifiedToTraditional)) {
      traditionalToSimplified[traditional] = simplified;
    }
    
    // Choose appropriate conversion map
    const conversionMap = targetForm === 'traditional' ? 
      simplifiedToTraditional : traditionalToSimplified;
    
// Convert character by character
let result = '';
for (let i = 0; i < text.length; i++) {
  const char = text[i];
  result += conversionMap[char] || char;
}

return result;
};

/**
* Get Japanese readings for a kanji
* @param {string} kanji - Single kanji character
* @returns {Object} - Object with on and kun readings
*/
export const getJapaneseReadings = (kanji) => {
// This is a placeholder implementation
// In a real app, you would use a database of kanji readings

// Sample readings for common kanji
const readings = {
  '日': { on: ['ニチ', 'ジツ'], kun: ['ひ', '-び', '-か'] },
  '月': { on: ['ゲツ', 'ガツ'], kun: ['つき'] },
  '火': { on: ['カ'], kun: ['ひ', 'ほ-'] },
  '水': { on: ['スイ'], kun: ['みず', 'みず-'] },
  '木': { on: ['モク', 'ボク'], kun: ['き', 'こ-'] },
  '金': { on: ['キン', 'コン'], kun: ['かね', 'かな-'] },
  '土': { on: ['ド', 'ト'], kun: ['つち'] },
  '人': { on: ['ジン', 'ニン'], kun: ['ひと', '-り', '-と'] },
  '大': { on: ['ダイ', 'タイ'], kun: ['おお-', 'おお.きい'] },
  '小': { on: ['ショウ'], kun: ['ちい-', 'こ-', 'お-'] },
  '山': { on: ['サン'], kun: ['やま'] },
  '川': { on: ['セン'], kun: ['かわ'] },
  '田': { on: ['デン'], kun: ['た'] },
  '心': { on: ['シン'], kun: ['こころ'] },
  '出': { on: ['シュツ'], kun: ['で-る', '-だ-す'] },
  '入': { on: ['ニュウ'], kun: ['い-る', '-い-れる'] },
  '上': { on: ['ジョウ'], kun: ['うえ', '-うわ-', 'かみ', 'あ-げる'] },
  '下': { on: ['カ', 'ゲ'], kun: ['した', 'しも', 'さ-げる', 'くだ-る'] },
  '手': { on: ['シュ'], kun: ['て', 'て-'] },
  '足': { on: ['ソク'], kun: ['あし', 'た-りる'] },
  '目': { on: ['モク'], kun: ['め', '-め'] },
  '耳': { on: ['ジ'], kun: ['みみ'] },
  '口': { on: ['コウ', 'ク'], kun: ['くち'] },
  '学': { on: ['ガク'], kun: ['まな-ぶ'] },
  '校': { on: ['コウ'], kun: [] },
  '生': { on: ['セイ', 'ショウ'], kun: ['い-きる', 'う-む', 'は-える'] }
};

return readings[kanji] || { on: [], kun: [] };
};

/**
* Decompose Korean Hangul into jamo components
* @param {string} hangul - Single Hangul character
* @returns {Object} - Object with initial, medial, and final components
*/
export const decomposeHangul = (hangul) => {
if (!/[\uAC00-\uD7AF]/.test(hangul)) {
  return { initial: '', medial: '', final: '' };
}

// Hangul block = initial (19 possible) + medial (21 possible) + final (28 possible including none)
// Formula: [(initial * 21) + medial] * 28 + final + 0xAC00

const charCode = hangul.charCodeAt(0);
const offset = charCode - 0xAC00;

// 28 possible finals, including none (index 0)
const finalIndex = offset % 28;
// 21 possible medials
const medialIndex = Math.floor(offset / 28) % 21;
// 19 possible initials
const initialIndex = Math.floor(Math.floor(offset / 28) / 21);

// Arrays of components
const initials = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
];

const medials = [
  'ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 
  'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'
];

const finals = [
  '', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ',
  'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
];

return {
  initial: initials[initialIndex],
  medial: medials[medialIndex],
  final: finals[finalIndex]
};
};

/**
* Convert hiragana to katakana or vice versa
* @param {string} text - Japanese text
* @param {string} target - Target script ('hiragana' or 'katakana')
* @returns {string} - Converted text
*/
export const convertJapaneseScript = (text, target) => {
if (!text) return '';

// Hiragana range: U+3040 to U+309F
// Katakana range: U+30A0 to U+30FF

if (target === 'katakana') {
  // Convert hiragana to katakana (add 96 to char code)
  return text.replace(/[\u3040-\u309F]/g, char => {
    return String.fromCharCode(char.charCodeAt(0) + 96);
  });
} else if (target === 'hiragana') {
  // Convert katakana to hiragana (subtract 96 from char code)
  return text.replace(/[\u30A0-\u30FF]/g, char => {
    return String.fromCharCode(char.charCodeAt(0) - 96);
  });
}

return text;
};

/**
* Get example words containing a specific character
* @param {string} character - Target character
* @param {string} language - Language code ('ja', 'zh', 'ko')
* @returns {Array} - Array of example words with meanings
*/
export const getExampleWords = (character, language) => {
// This is a placeholder implementation
// In a real app, you would use a comprehensive database or API

const examples = {
  ja: {
    '日': [
      { word: '日本', reading: 'にほん', meaning: 'Japan' },
      { word: '日曜日', reading: 'にちようび', meaning: 'Sunday' },
      { word: '今日', reading: 'きょう', meaning: 'Today' }
    ],
    '月': [
      { word: '月曜日', reading: 'げつようび', meaning: 'Monday' },
      { word: '一月', reading: 'いちがつ', meaning: 'January' },
      { word: '月見', reading: 'つきみ', meaning: 'Moon viewing' }
    ],
    '人': [
      { word: '人間', reading: 'にんげん', meaning: 'Human' },
      { word: '外国人', reading: 'がいこくじん', meaning: 'Foreigner' },
      { word: '一人', reading: 'ひとり', meaning: 'One person' }
    ]
  },
  zh: {
    '人': [
      { word: '人民', pinyin: 'rén mín', meaning: 'People' },
      { word: '中国人', pinyin: 'zhōng guó rén', meaning: 'Chinese person' },
      { word: '人生', pinyin: 'rén shēng', meaning: 'Life' }
    ],
    '中': [
      { word: '中国', pinyin: 'zhōng guó', meaning: 'China' },
      { word: '中心', pinyin: 'zhōng xīn', meaning: 'Center' },
      { word: '中文', pinyin: 'zhōng wén', meaning: 'Chinese language' }
    ],
    '文': [
      { word: '文化', pinyin: 'wén huà', meaning: 'Culture' },
      { word: '中文', pinyin: 'zhōng wén', meaning: 'Chinese language' },
      { word: '文学', pinyin: 'wén xué', meaning: 'Literature' }
    ]
  },
  ko: {
    '사': [
      { word: '사람', romanized: 'saram', meaning: 'Person' },
      { word: '사과', romanized: 'sagwa', meaning: 'Apple' },
      { word: '사랑', romanized: 'sarang', meaning: 'Love' }
    ],
    '학': [
      { word: '학교', romanized: 'hakgyo', meaning: 'School' },
      { word: '과학', romanized: 'gwahak', meaning: 'Science' },
      { word: '학생', romanized: 'haksaeng', meaning: 'Student' }
    ],
    '한': [
      { word: '한국', romanized: 'hanguk', meaning: 'Korea' },
      { word: '한글', romanized: 'hangeul', meaning: 'Korean alphabet' },
      { word: '한국어', romanized: 'hangugeo', meaning: 'Korean language' }
    ]
  }
};

// Return examples if available
if (examples[language] && examples[language][character]) {
  return examples[language][character];
}

return [];
};

/**
* Generate stroke order information for a character
* @param {string} character - Single CJK character
* @returns {Object} - Object with stroke order data
*/
export const getStrokeOrder = (character) => {
// This is a placeholder implementation
// In a real app, you would use an API or database with SVG paths for stroke animations

// Return a basic structure that would be replaced with actual data
return {
  character,
  totalStrokes: getStrokeCount(character) || 0,
  // This would normally contain SVG path data or animation sequence
  strokeData: [],
  // Flag to indicate this is just placeholder data
  isPlaceholder: true
};
};

export default {
getJLPTLevel,
getHSKLevel,
getRadicals,
getStrokeCount,
convertChineseForm,
getJapaneseReadings,
decomposeHangul,
convertJapaneseScript,
getExampleWords,
getStrokeOrder
};