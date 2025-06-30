import React from "react";

export const AnsiText = ({ children }) => {
  if (!children || typeof children !== "string") {
    return <span>{children}</span>;
  }

  const parseAnsiToReact = (text) => {
    const ansiRegex = /\u001b\[([0-9;]*)m/g;
    const parts = [];
    let lastIndex = 0;
    let currentStyle = {
      color: "#ddd",
      backgroundColor: "transparent",
      fontWeight: "normal",
      fontStyle: "normal",
      textDecoration: "none",
      opacity: 1,
    };

    let match;
    while ((match = ansiRegex.exec(text)) !== null) {
      // Add text before the escape sequence
      if (match.index > lastIndex) {
        const textContent = text.slice(lastIndex, match.index);
        if (textContent) {
          parts.push(
            <span key={parts.length} style={{ ...currentStyle }}>
              {textContent}
            </span>,
          );
        }
      }

      // Parse the escape sequence
      const codes = match[1].split(";").map((c) => parseInt(c) || 0);

      for (let i = 0; i < codes.length; i++) {
        const code = codes[i];

        if (code === 0) {
          // Reset all formatting
          currentStyle = {
            color: "#ddd",
            backgroundColor: "transparent",
            fontWeight: "normal",
            fontStyle: "normal",
            textDecoration: "none",
            opacity: 1,
          };
        } else if (code === 1) {
          // Bold
          currentStyle.fontWeight = "bold";
        } else if (code === 2) {
          // Dim
          currentStyle.opacity = 0.7;
        } else if (code === 3) {
          // Italic
          currentStyle.fontStyle = "italic";
        } else if (code === 4) {
          // Underline
          currentStyle.textDecoration = "underline";
        } else if (code === 7) {
          // Reverse (swap fg and bg)
          const temp = currentStyle.color;
          currentStyle.color = currentStyle.backgroundColor;
          currentStyle.backgroundColor = temp;
        } else if (code === 22) {
          // Normal intensity
          currentStyle.fontWeight = "normal";
          currentStyle.opacity = 1;
        } else if (code === 23) {
          // Not italic
          currentStyle.fontStyle = "normal";
        } else if (code === 24) {
          // Not underline
          currentStyle.textDecoration = "none";
        } else if (code >= 30 && code <= 37) {
          // Standard foreground colors
          const colors = [
            "#000",
            "#a00",
            "#0a0",
            "#aa0",
            "#00a",
            "#a0a",
            "#0aa",
            "#aaa",
          ];
          currentStyle.color = colors[code - 30];
        } else if (code >= 40 && code <= 47) {
          // Standard background colors
          const colors = [
            "#000",
            "#a00",
            "#0a0",
            "#aa0",
            "#00a",
            "#a0a",
            "#0aa",
            "#aaa",
          ];
          currentStyle.backgroundColor = colors[code - 40];
        } else if (code >= 90 && code <= 97) {
          // Bright foreground colors
          const colors = [
            "#555",
            "#f55",
            "#5f5",
            "#ff5",
            "#55f",
            "#f5f",
            "#5ff",
            "#fff",
          ];
          currentStyle.color = colors[code - 90];
        } else if (code >= 100 && code <= 107) {
          // Bright background colors
          const colors = [
            "#555",
            "#f55",
            "#5f5",
            "#ff5",
            "#55f",
            "#f5f",
            "#5ff",
            "#fff",
          ];
          currentStyle.backgroundColor = colors[code - 100];
        } else if (code === 38 && codes[i + 1] === 2) {
          // RGB foreground color
          const r = codes[i + 2] || 0;
          const g = codes[i + 3] || 0;
          const b = codes[i + 4] || 0;
          currentStyle.color = `rgb(${r}, ${g}, ${b})`;
          i += 4;
        } else if (code === 48 && codes[i + 1] === 2) {
          // RGB background color
          const r = codes[i + 2] || 0;
          const g = codes[i + 3] || 0;
          const b = codes[i + 4] || 0;
          currentStyle.backgroundColor = `rgb(${r}, ${g}, ${b})`;
          i += 4;
        } else if (code === 38 && codes[i + 1] === 5) {
          // 256-color foreground
          const colorIndex = codes[i + 2] || 0;
          currentStyle.color = get256Color(colorIndex);
          i += 2;
        } else if (code === 48 && codes[i + 1] === 5) {
          // 256-color background
          const colorIndex = codes[i + 2] || 0;
          currentStyle.backgroundColor = get256Color(colorIndex);
          i += 2;
        }
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text after last escape sequence
    if (lastIndex < text.length) {
      const textContent = text.slice(lastIndex);
      if (textContent) {
        parts.push(
          <span key={parts.length} style={{ ...currentStyle }}>
            {textContent}
          </span>,
        );
      }
    }

    return <>{parts}</>;
  };

  // Convert 256-color index to hex color
  const get256Color = (index) => {
    // Standard 16 colors
    if (index < 16) {
      const colors = [
        "#000000",
        "#800000",
        "#008000",
        "#808000",
        "#000080",
        "#800080",
        "#008080",
        "#c0c0c0",
        "#808080",
        "#ff0000",
        "#00ff00",
        "#ffff00",
        "#0000ff",
        "#ff00ff",
        "#00ffff",
        "#ffffff",
      ];
      return colors[index];
    }

    // 216 color cube (16-231)
    if (index >= 16 && index <= 231) {
      const colorIndex = index - 16;
      const r = Math.floor(colorIndex / 36);
      const g = Math.floor((colorIndex % 36) / 6);
      const b = colorIndex % 6;

      const toHex = (n) => {
        const val = n === 0 ? 0 : 55 + n * 40;
        return val.toString(16).padStart(2, "0");
      };

      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    // Grayscale (232-255)
    if (index >= 232 && index <= 255) {
      const gray = 8 + (index - 232) * 10;
      const hex = gray.toString(16).padStart(2, "0");
      return `#${hex}${hex}${hex}`;
    }

    return "#ffffff";
  };

  return parseAnsiToReact(children);
};
