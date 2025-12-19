// Generate unique random tokens for masked links
export const generateRandomToken = (length: number = 8): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Generate a masked link with multiple parameters
export interface MaskedLinkParams {
  blogId?: string;
  relatedSearchId?: string;
  webResultId?: string;
  targetWr?: number;
}

export const generateMaskedLink = (params: MaskedLinkParams): string => {
  const { blogId, relatedSearchId, webResultId, targetWr } = params;
  const baseUrl = window.location.origin;
  
  // Generate random tokens for obfuscation
  const p = blogId ? blogId.substring(0, 8) : generateRandomToken(6);
  const n = generateRandomToken(12);
  const c = webResultId ? webResultId.substring(0, 8) : generateRandomToken(6);
  
  // Create the link with parameters
  const searchParams = new URLSearchParams();
  searchParams.set('p', p);
  searchParams.set('n', n);
  searchParams.set('c', c);
  
  if (targetWr) {
    return `${baseUrl}/wr/${targetWr}?${searchParams.toString()}`;
  }
  
  return `${baseUrl}/link?${searchParams.toString()}`;
};

// Generate a blog link with number instead of slug
export const generateBlogLink = (blogIndex: number): string => {
  const baseUrl = window.location.origin;
  const n = generateRandomToken(8);
  return `${baseUrl}/p=${blogIndex}&n=${n}`;
};

// Format date for display
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  });
};

// Copy web result details in column format
export interface WebResultCopyData {
  title?: boolean;
  description?: boolean;
  blogName?: string;
  relatedSearch?: string;
  originalLink?: string;
  date?: string;
  name?: string;
}

export const formatWebResultForCopy = (
  data: WebResultCopyData,
  selectedFields: (keyof WebResultCopyData)[]
): string => {
  const lines: string[] = [];
  
  if (selectedFields.includes('name') && data.name) {
    lines.push(`Name:\t\t\t${data.name}`);
  }
  if (selectedFields.includes('title') && data.title) {
    lines.push(`Title:\t\t\t${data.title}`);
  }
  if (selectedFields.includes('description') && data.description) {
    lines.push(`Description:\t${data.description}`);
  }
  if (selectedFields.includes('blogName') && data.blogName) {
    lines.push(`Blog:\t\t\t${data.blogName}`);
  }
  if (selectedFields.includes('relatedSearch') && data.relatedSearch) {
    lines.push(`Related Search:\t${data.relatedSearch}`);
  }
  if (selectedFields.includes('originalLink') && data.originalLink) {
    lines.push(`Original Link:\t${data.originalLink}`);
  }
  if (selectedFields.includes('date') && data.date) {
    lines.push(`Date:\t\t\t${data.date}`);
  }
  
  return lines.join('\n');
};
