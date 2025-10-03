import React from 'react';

/**
 * Process text to make velostrada/velostrăzi terms clickable
 * @param text The text to process
 * @param onVelostradaClick Callback when velostrada link is clicked
 * @returns React elements with clickable velostrada links
 */
export function processVelostradaLinks(
  text: string,
  onVelostradaClick: () => void
): React.ReactNode {
  // Match velostrada/velostrăzi and their variations (case-insensitive)
  const pattern = /(velostrad[aă]|velostr[aă]zi)/gi;
  
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let key = 0;

  // Reset regex lastIndex
  const regex = new RegExp(pattern);
  
  while ((match = regex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(
        <React.Fragment key={`text-${key++}`}>
          {text.substring(lastIndex, match.index)}
        </React.Fragment>
      );
    }

    // Add clickable link for velostrada term
    parts.push(
      <button
        key={`link-${key++}`}
        onClick={(e) => {
          e.preventDefault();
          onVelostradaClick();
        }}
        className="text-blue-600 hover:text-blue-800 underline cursor-pointer bg-transparent border-none p-0 font-inherit"
      >
        {match[0]}
      </button>
    );

    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(
      <React.Fragment key={`text-${key++}`}>
        {text.substring(lastIndex)}
      </React.Fragment>
    );
  }

  return parts.length > 0 ? parts : text;
}

