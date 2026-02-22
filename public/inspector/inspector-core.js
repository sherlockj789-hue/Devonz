// ============================================================
// Inspector Core Module — Phase 3.1
// Element selection, highlighting, mouse interaction, resize
// handles, style editing, text editing, revert, bulk ops,
// element counting, and deletion.
//
// Runs inside the preview iframe. Plain JS, no imports.
// Will be concatenated into a single IIFE by the build script.
// ============================================================

// --- State ---
let isInspectorActive = false;
let inspectorStyle = null;
let currentHighlight = null;
let selectedElement = null;
let originalStyles = {};
let originalText = '';
let resizeHandles = null;
let isResizing = false;
let resizeStartX = 0;
let resizeStartY = 0;
let resizeStartWidth = 0;
let resizeStartHeight = 0;
let resizeHandle = null;
let bulkOriginalStyles = new Map();

// --- Relevant CSS properties (matches types.ts RELEVANT_STYLE_PROPS) ---
const RELEVANT_STYLE_PROPS = [
  'display',
  'position',
  'width',
  'height',
  'margin',
  'padding',
  'border',
  'background',
  'background-color',
  'color',
  'font-size',
  'font-weight',
  'font-family',
  'text-align',
  'flex-direction',
  'justify-content',
  'align-items',
  'gap',
  'border-radius',
  'box-shadow',
  'opacity',
  'overflow',
];

// ============================================================
// Scrollbar Styling
// ============================================================

function injectScrollbarStyles() {
  const style = document.createElement('style');
  style.textContent = `
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(100, 100, 100, 0.4); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(100, 100, 100, 0.6); }
    html { scrollbar-width: thin; scrollbar-color: rgba(100, 100, 100, 0.4) transparent; }
  `;
  (document.head || document.documentElement).appendChild(style);
}

injectScrollbarStyles();

// ============================================================
// Helper: Send message to parent
// ============================================================

function sendToParent(type, payload) {
  window.parent.postMessage({ type, ...payload }, '*');
}

// ============================================================
// Element Info Utilities
// ============================================================

function getElementClassName(element) {
  if (!element.className) {
    return '';
  }

  if (typeof element.className === 'string') {
    return element.className;
  }

  if (element.className.baseVal !== undefined) {
    return element.className.baseVal;
  }

  return element.className.toString();
}

function getRelevantStyles(element) {
  const computedStyles = window.getComputedStyle(element);
  const styles = {};

  RELEVANT_STYLE_PROPS.forEach(function (prop) {
    const value = computedStyles.getPropertyValue(prop);

    if (value) {
      styles[prop] = value;
    }
  });

  return styles;
}

function getBoxModel(element) {
  const computedStyles = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();

  function parseValue(value) {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }

  const computedWidth = computedStyles.getPropertyValue('width');
  const computedHeight = computedStyles.getPropertyValue('height');
  const width = computedWidth === 'auto' ? rect.width : parseValue(computedWidth);
  const height = computedHeight === 'auto' ? rect.height : parseValue(computedHeight);

  return {
    margin: {
      top: parseValue(computedStyles.getPropertyValue('margin-top')),
      right: parseValue(computedStyles.getPropertyValue('margin-right')),
      bottom: parseValue(computedStyles.getPropertyValue('margin-bottom')),
      left: parseValue(computedStyles.getPropertyValue('margin-left')),
    },
    padding: {
      top: parseValue(computedStyles.getPropertyValue('padding-top')),
      right: parseValue(computedStyles.getPropertyValue('padding-right')),
      bottom: parseValue(computedStyles.getPropertyValue('padding-bottom')),
      left: parseValue(computedStyles.getPropertyValue('padding-left')),
    },
    border: {
      top: parseValue(computedStyles.getPropertyValue('border-top-width')),
      right: parseValue(computedStyles.getPropertyValue('border-right-width')),
      bottom: parseValue(computedStyles.getPropertyValue('border-bottom-width')),
      left: parseValue(computedStyles.getPropertyValue('border-left-width')),
    },
    borderColor: computedStyles.getPropertyValue('border-color'),
    borderStyle: computedStyles.getPropertyValue('border-style'),
    width: width,
    height: height,
    boxSizing: computedStyles.getPropertyValue('box-sizing'),
  };
}

function createReadableSelector(element) {
  let selector = element.tagName.toLowerCase();

  if (element.id) {
    selector += '#' + element.id;
  }

  const className = getElementClassName(element);

  if (className.trim()) {
    const classes = className.trim().split(/\s+/).slice(0, 3);
    selector += '.' + classes.join('.');
  }

  return selector;
}

function createElementDisplayText(element) {
  const tagName = element.tagName.toLowerCase();
  let displayText = '<' + tagName;

  if (element.id) {
    displayText += ' id="' + element.id + '"';
  }

  const className = getElementClassName(element);

  if (className.trim()) {
    const classes = className.trim().split(/\s+/);
    const displayClasses =
      classes.length > 3 ? classes.slice(0, 3).join(' ') + '...' : classes.join(' ');
    displayText += ' class="' + displayClasses + '"';
  }

  const importantAttrs = ['type', 'name', 'href', 'src', 'alt', 'title'];

  importantAttrs.forEach(function (attr) {
    const value = element.getAttribute(attr);

    if (value) {
      const truncatedValue =
        value.length > 30 ? value.substring(0, 30) + '...' : value;
      displayText += ' ' + attr + '="' + truncatedValue + '"';
    }
  });

  displayText += '>';

  const textElements = [
    'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'button', 'a', 'label',
  ];

  if (textElements.includes(tagName) && element.textContent) {
    const textPreview = element.textContent.trim().substring(0, 50);

    if (textPreview) {
      displayText +=
        textPreview.length < element.textContent.trim().length
          ? textPreview + '...'
          : textPreview;
    }
  }

  displayText += '</' + tagName + '>';

  return displayText;
}

function extractElementColors(element) {
  var colors = new Set();
  var colorProps = ['color', 'background-color', 'border-color', 'outline-color'];

  var computedStyles = window.getComputedStyle(element);

  colorProps.forEach(function (prop) {
    var value = computedStyles.getPropertyValue(prop);

    if (value && value !== 'rgba(0, 0, 0, 0)' && value !== 'transparent') {
      colors.add(value);
    }
  });

  function collectColors(el, depth) {
    if (depth > 3) {
      return;
    }

    var styles = window.getComputedStyle(el);

    colorProps.forEach(function (prop) {
      var value = styles.getPropertyValue(prop);

      if (value && value !== 'rgba(0, 0, 0, 0)' && value !== 'transparent') {
        colors.add(value);
      }
    });

    Array.from(el.children)
      .slice(0, 10)
      .forEach(function (child) {
        collectColors(child, depth + 1);
      });
  }

  Array.from(element.children)
    .slice(0, 10)
    .forEach(function (child) {
      collectColors(child, 1);
    });

  if (element.parentElement) {
    var parentStyles = window.getComputedStyle(element.parentElement);

    colorProps.forEach(function (prop) {
      var value = parentStyles.getPropertyValue(prop);

      if (value && value !== 'rgba(0, 0, 0, 0)' && value !== 'transparent') {
        colors.add(value);
      }
    });
  }

  return Array.from(colors).slice(0, 16);
}

function getElementPath(element) {
  var path = [];
  var current = element;

  while (
    current &&
    current !== document.body &&
    current !== document.documentElement
  ) {
    var pathSegment = current.tagName.toLowerCase();

    if (current.id) {
      pathSegment += '#' + current.id;
    } else {
      var cn = getElementClassName(current);

      if (cn.trim()) {
        var firstClass = cn.trim().split(/\s+/)[0];
        pathSegment += '.' + firstClass;
      }
    }

    path.unshift(pathSegment);
    current = current.parentElement;

    if (path.length >= 5) {
      break;
    }
  }

  return path.join(' > ');
}

function createElementSummary(element) {
  if (!element || element === document.documentElement) {
    return null;
  }

  var tagName = element.tagName.toLowerCase();
  var id = element.id || '';
  var className = getElementClassName(element);
  var classes = className
    .trim()
    .split(/\s+/)
    .filter(function (c) {
      return c && !c.startsWith('inspector-');
    });

  var selector = tagName;

  if (id) {
    selector += '#' + id;
  } else if (classes.length > 0) {
    selector += '.' + classes[0];
  }

  var displayText = tagName;

  if (id) {
    displayText = tagName + '#' + id;
  } else if (classes.length > 0) {
    displayText = tagName + '.' + classes.slice(0, 2).join('.');
  }

  return {
    tagName: tagName,
    id: id,
    classes: classes,
    selector: selector,
    displayText: displayText,
    hasChildren: element.children.length > 0,
  };
}

function getElementHierarchy(element) {
  var parents = [];
  var children = [];
  var siblings = [];

  var current = element.parentElement;

  while (current && current !== document.documentElement) {
    var summary = createElementSummary(current);

    if (summary) {
      parents.unshift(summary);
    }

    current = current.parentElement;
  }

  var childElements = Array.from(element.children).slice(0, 20);

  for (var i = 0; i < childElements.length; i++) {
    var childSummary = createElementSummary(childElements[i]);

    if (childSummary) {
      children.push(childSummary);
    }
  }

  if (element.parentElement) {
    var siblingElements = Array.from(element.parentElement.children)
      .filter(function (el) {
        return el !== element;
      })
      .slice(0, 10);

    for (var j = 0; j < siblingElements.length; j++) {
      var sibSummary = createElementSummary(siblingElements[j]);

      if (sibSummary) {
        siblings.push(sibSummary);
      }
    }
  }

  var currentSummary = createElementSummary(element);

  return {
    parents: parents,
    current: currentSummary,
    children: children,
    siblings: siblings,
    totalChildren: element.children.length,
    totalSiblings: element.parentElement
      ? element.parentElement.children.length - 1
      : 0,
  };
}

function createElementInfo(element) {
  var rect = element.getBoundingClientRect();

  return {
    tagName: element.tagName,
    className: getElementClassName(element),
    id: element.id || '',
    textContent: (element.textContent || '').slice(0, 100),
    styles: getRelevantStyles(element),
    boxModel: getBoxModel(element),
    rect: {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      top: rect.top,
      left: rect.left,
    },
    selector: createReadableSelector(element),
    displayText: createElementDisplayText(element),
    elementPath: getElementPath(element),
    hierarchy: getElementHierarchy(element),
    colors: extractElementColors(element),
  };
}

function getElementUniqueId(element) {
  if (element.id) {
    return '#' + element.id;
  }

  var path = [];
  var current = element;

  while (current && current !== document.body) {
    var segment = current.tagName.toLowerCase();

    if (current.id) {
      segment += '#' + current.id;
      path.unshift(segment);
      break;
    } else {
      var siblings = current.parentElement ? current.parentElement.children : [];
      var index = Array.from(siblings).indexOf(current);
      segment += ':nth-child(' + (index + 1) + ')';
    }

    path.unshift(segment);
    current = current.parentElement;
  }

  return path.join('>');
}

// ============================================================
// CSS property helper
// ============================================================

function toCamelCase(property) {
  return property.replace(/-([a-z])/g, function (_, letter) {
    return letter.toUpperCase();
  });
}

// ============================================================
// Mouse Interaction Handlers
// ============================================================

function handleMouseMove(e) {
  if (!isInspectorActive) {
    return;
  }

  var target = e.target;

  if (!target || target === document.body || target === document.documentElement) {
    return;
  }

  if (currentHighlight) {
    currentHighlight.classList.remove('inspector-highlight');
  }

  target.classList.add('inspector-highlight');
  currentHighlight = target;

  sendToParent('INSPECTOR_HOVER', { elementInfo: createElementInfo(target) });
}

function handleClick(e) {
  if (!isInspectorActive) {
    return;
  }

  e.preventDefault();
  e.stopPropagation();

  var target = e.target;

  if (!target || target === document.body || target === document.documentElement) {
    return;
  }

  selectedElement = target;

  // Capture original styles for revert
  originalStyles = {};
  var computedStyles = window.getComputedStyle(target);

  RELEVANT_STYLE_PROPS.forEach(function (prop) {
    originalStyles[prop] = computedStyles.getPropertyValue(prop);
  });

  originalText = target.textContent || '';

  sendToParent('INSPECTOR_CLICK', { elementInfo: createElementInfo(target) });

  showResizeHandles(target);
}

function handleMouseLeave() {
  if (!isInspectorActive) {
    return;
  }

  if (currentHighlight) {
    currentHighlight.classList.remove('inspector-highlight');
    currentHighlight = null;
  }

  sendToParent('INSPECTOR_LEAVE', {});
}

// ============================================================
// Resize Handles
// ============================================================

function showResizeHandles(element) {
  hideResizeHandles();

  if (!element || element === document.body) {
    return;
  }

  var rect = element.getBoundingClientRect();

  resizeHandles = document.createElement('div');
  resizeHandles.className = 'inspector-resize-handles';
  resizeHandles.style.cssText =
    'position: fixed;' +
    'top: ' + rect.top + 'px;' +
    'left: ' + rect.left + 'px;' +
    'width: ' + rect.width + 'px;' +
    'height: ' + rect.height + 'px;' +
    'pointer-events: none;' +
    'z-index: 999999;';

  var handles = [
    { pos: 'nw', cursor: 'nw-resize', top: '-4px', left: '-4px' },
    { pos: 'ne', cursor: 'ne-resize', top: '-4px', right: '-4px' },
    { pos: 'sw', cursor: 'sw-resize', bottom: '-4px', left: '-4px' },
    { pos: 'se', cursor: 'se-resize', bottom: '-4px', right: '-4px' },
    { pos: 'n', cursor: 'n-resize', top: '-4px', left: '50%', transform: 'translateX(-50%)' },
    { pos: 's', cursor: 's-resize', bottom: '-4px', left: '50%', transform: 'translateX(-50%)' },
    { pos: 'w', cursor: 'w-resize', top: '50%', left: '-4px', transform: 'translateY(-50%)' },
    { pos: 'e', cursor: 'e-resize', top: '50%', right: '-4px', transform: 'translateY(-50%)' },
  ];

  handles.forEach(function (cfg) {
    var handle = document.createElement('div');
    handle.className = 'inspector-handle inspector-handle-' + cfg.pos;
    handle.dataset.position = cfg.pos;

    var styleStr =
      'position: absolute;' +
      'width: 8px;' +
      'height: 8px;' +
      'background: #3b82f6;' +
      'border: 1px solid white;' +
      'border-radius: 2px;' +
      'cursor: ' + cfg.cursor + ';' +
      'pointer-events: auto;';

    if (cfg.top !== undefined) { styleStr += 'top: ' + cfg.top + ';'; }
    if (cfg.bottom !== undefined) { styleStr += 'bottom: ' + cfg.bottom + ';'; }
    if (cfg.left !== undefined) { styleStr += 'left: ' + cfg.left + ';'; }
    if (cfg.right !== undefined) { styleStr += 'right: ' + cfg.right + ';'; }
    if (cfg.transform) { styleStr += 'transform: ' + cfg.transform + ';'; }

    handle.style.cssText = styleStr;

    handle.addEventListener('mousedown', function (e) {
      startResize(e, cfg.pos);
    });

    resizeHandles.appendChild(handle);
  });

  // Dimension label
  var dimensions = document.createElement('div');
  dimensions.className = 'inspector-dimensions';
  dimensions.style.cssText =
    'position: absolute;' +
    'bottom: -20px;' +
    'left: 50%;' +
    'transform: translateX(-50%);' +
    'background: #3b82f6;' +
    'color: white;' +
    'padding: 2px 6px;' +
    'border-radius: 3px;' +
    'font-size: 10px;' +
    'font-family: monospace;' +
    'white-space: nowrap;' +
    'pointer-events: none;';
  dimensions.textContent =
    Math.round(rect.width) + ' \u00D7 ' + Math.round(rect.height);
  resizeHandles.appendChild(dimensions);

  document.body.appendChild(resizeHandles);
}

function hideResizeHandles() {
  if (resizeHandles) {
    resizeHandles.remove();
    resizeHandles = null;
  }
}

function updateResizeHandles() {
  if (!resizeHandles || !selectedElement) {
    return;
  }

  var rect = selectedElement.getBoundingClientRect();
  resizeHandles.style.top = rect.top + 'px';
  resizeHandles.style.left = rect.left + 'px';
  resizeHandles.style.width = rect.width + 'px';
  resizeHandles.style.height = rect.height + 'px';

  var dimensions = resizeHandles.querySelector('.inspector-dimensions');

  if (dimensions) {
    dimensions.textContent =
      Math.round(rect.width) + ' \u00D7 ' + Math.round(rect.height);
  }
}

function startResize(e, position) {
  e.preventDefault();
  e.stopPropagation();

  if (!selectedElement) {
    return;
  }

  isResizing = true;
  resizeHandle = position;
  resizeStartX = e.clientX;
  resizeStartY = e.clientY;

  var rect = selectedElement.getBoundingClientRect();
  resizeStartWidth = rect.width;
  resizeStartHeight = rect.height;

  document.addEventListener('mousemove', handleResize);
  document.addEventListener('mouseup', stopResize);
}

function handleResize(e) {
  if (!isResizing || !selectedElement) {
    return;
  }

  var deltaX = e.clientX - resizeStartX;
  var deltaY = e.clientY - resizeStartY;

  var newWidth = resizeStartWidth;
  var newHeight = resizeStartHeight;

  if (resizeHandle.includes('e')) { newWidth = resizeStartWidth + deltaX; }
  if (resizeHandle.includes('w')) { newWidth = resizeStartWidth - deltaX; }
  if (resizeHandle.includes('s')) { newHeight = resizeStartHeight + deltaY; }
  if (resizeHandle.includes('n')) { newHeight = resizeStartHeight - deltaY; }

  newWidth = Math.max(20, newWidth);
  newHeight = Math.max(20, newHeight);

  selectedElement.style.width = newWidth + 'px';
  selectedElement.style.height = newHeight + 'px';

  updateResizeHandles();

  sendToParent('INSPECTOR_RESIZE', { width: newWidth, height: newHeight });
}

function stopResize() {
  isResizing = false;
  resizeHandle = null;

  document.removeEventListener('mousemove', handleResize);
  document.removeEventListener('mouseup', stopResize);

  if (selectedElement) {
    sendToParent('INSPECTOR_RESIZE_END', {
      elementInfo: createElementInfo(selectedElement),
    });
  }
}

// ============================================================
// Inspector Activation
// ============================================================

function setInspectorActive(active) {
  isInspectorActive = active;

  if (active) {
    if (!inspectorStyle) {
      inspectorStyle = document.createElement('style');
      inspectorStyle.textContent =
        '.inspector-active * { cursor: crosshair !important; }' +
        '.inspector-highlight {' +
        '  outline: 2px solid #3b82f6 !important;' +
        '  outline-offset: -2px !important;' +
        '  background-color: rgba(59, 130, 246, 0.1) !important;' +
        '}' +
        '.inspector-bulk-highlight {' +
        '  outline: 2px solid #a855f7 !important;' +
        '  outline-offset: -2px !important;' +
        '  background-color: rgba(168, 85, 247, 0.15) !important;' +
        '  transition: outline 0.3s, background-color 0.3s;' +
        '}';
      document.head.appendChild(inspectorStyle);
    }

    document.body.classList.add('inspector-active');

    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('mouseleave', handleMouseLeave, true);
  } else {
    document.body.classList.remove('inspector-active');

    if (currentHighlight) {
      currentHighlight.classList.remove('inspector-highlight');
      currentHighlight = null;
    }

    hideResizeHandles();

    document.removeEventListener('mousemove', handleMouseMove, true);
    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('mouseleave', handleMouseLeave, true);

    if (inspectorStyle) {
      inspectorStyle.remove();
      inspectorStyle = null;
    }
  }
}

// ============================================================
// Style Editing
// ============================================================

function handleStyleEdit(property, value) {
  if (!selectedElement) {
    return;
  }

  try {
    selectedElement.style[toCamelCase(property)] = value;

    sendToParent('INSPECTOR_EDIT_APPLIED', {
      property: property,
      value: value,
      success: true,
    });
  } catch (error) {
    sendToParent('INSPECTOR_EDIT_APPLIED', {
      property: property,
      value: value,
      success: false,
      error: error.message,
    });
  }
}

// ============================================================
// Text Editing
// ============================================================

function handleTextEdit(text) {
  if (!selectedElement) {
    return;
  }

  try {
    var textElements = [
      'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'button', 'a', 'label', 'div', 'li', 'td', 'th',
    ];
    var tagName = selectedElement.tagName.toLowerCase();

    if (textElements.includes(tagName)) {
      if (
        selectedElement.children.length === 0 ||
        selectedElement.childNodes.length === 1
      ) {
        selectedElement.textContent = text;
      } else {
        for (var i = 0; i < selectedElement.childNodes.length; i++) {
          var node = selectedElement.childNodes[i];

          if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
            node.textContent = text;
            break;
          }
        }
      }
    }

    sendToParent('INSPECTOR_TEXT_APPLIED', { text: text, success: true });
  } catch (error) {
    sendToParent('INSPECTOR_TEXT_APPLIED', {
      text: text,
      success: false,
      error: error.message,
    });
  }
}

// ============================================================
// Select by Selector (tree navigator)
// ============================================================

function handleSelectBySelector(selector) {
  try {
    var element = document.querySelector(selector);

    if (!element) {
      return;
    }

    if (selectedElement) {
      selectedElement.classList.remove('inspector-selected');
    }

    if (currentHighlight) {
      currentHighlight.classList.remove('inspector-highlight');
      currentHighlight = null;
    }

    selectedElement = element;
    element.classList.add('inspector-selected');
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });

    showResizeHandles(element);

    sendToParent('INSPECTOR_CLICK', { elementInfo: createElementInfo(element) });
  } catch (error) {
    console.error('Inspector: error selecting by selector', error);
  }
}

// ============================================================
// Revert
// ============================================================

function handleRevert() {
  if (!selectedElement) {
    return;
  }

  try {
    Object.keys(originalStyles).forEach(function (prop) {
      selectedElement.style[toCamelCase(prop)] = '';
    });

    if (originalText && selectedElement.textContent !== originalText) {
      selectedElement.textContent = originalText;
    }

    sendToParent('INSPECTOR_REVERTED', {
      elementInfo: createElementInfo(selectedElement),
      success: true,
    });
  } catch (error) {
    sendToParent('INSPECTOR_REVERTED', {
      success: false,
      error: error.message,
    });
  }
}

// ============================================================
// Bulk Style Editing
// ============================================================

function handleBulkStyleEdit(selector, property, value) {
  try {
    var elements = document.querySelectorAll(selector);

    if (elements.length === 0) {
      sendToParent('INSPECTOR_BULK_APPLIED', {
        selector: selector,
        property: property,
        value: value,
        count: 0,
        success: false,
        error: 'No matching elements found',
      });
      return;
    }

    var camelProp = toCamelCase(property);

    elements.forEach(function (element) {
      var key = selector + '|' + getElementUniqueId(element);

      if (!bulkOriginalStyles.has(key)) {
        bulkOriginalStyles.set(key, {});
      }

      var originalMap = bulkOriginalStyles.get(key);

      if (!(property in originalMap)) {
        originalMap[property] = element.style[camelProp] || '';
      }

      element.style[camelProp] = value;
    });

    // Brief highlight of affected elements
    elements.forEach(function (element) {
      element.classList.add('inspector-bulk-highlight');
    });

    setTimeout(function () {
      elements.forEach(function (element) {
        element.classList.remove('inspector-bulk-highlight');
      });
    }, 500);

    sendToParent('INSPECTOR_BULK_APPLIED', {
      selector: selector,
      property: property,
      value: value,
      count: elements.length,
      success: true,
    });
  } catch (error) {
    console.error('Inspector: bulk style error', error);

    sendToParent('INSPECTOR_BULK_APPLIED', {
      selector: selector,
      property: property,
      value: value,
      count: 0,
      success: false,
      error: error.message,
    });
  }
}

// ============================================================
// Bulk Revert
// ============================================================

function handleBulkRevert(selector) {
  try {
    var elements = document.querySelectorAll(selector);
    var revertedCount = 0;

    elements.forEach(function (element) {
      var key = selector + '|' + getElementUniqueId(element);
      var originalMap = bulkOriginalStyles.get(key);

      if (originalMap) {
        Object.keys(originalMap).forEach(function (prop) {
          element.style[toCamelCase(prop)] = originalMap[prop];
        });
        bulkOriginalStyles.delete(key);
        revertedCount++;
      }
    });

    sendToParent('INSPECTOR_BULK_REVERTED', {
      selector: selector,
      count: revertedCount,
      success: true,
    });
  } catch (error) {
    sendToParent('INSPECTOR_BULK_REVERTED', {
      selector: selector,
      count: 0,
      success: false,
      error: error.message,
    });
  }
}

// ============================================================
// Count Elements
// ============================================================

function handleCountElements(selector) {
  try {
    var elements = document.querySelectorAll(selector);

    sendToParent('INSPECTOR_ELEMENT_COUNT', {
      selector: selector,
      count: elements.length,
    });
  } catch (error) {
    sendToParent('INSPECTOR_ELEMENT_COUNT', {
      selector: selector,
      count: 0,
      error: error.message,
    });
  }
}

// ============================================================
// Delete Element
// ============================================================

function handleDeleteElement() {
  if (!selectedElement) {
    sendToParent('INSPECTOR_ELEMENT_DELETED', {
      selector: '',
      success: false,
      error: 'No element selected',
    });
    return;
  }

  try {
    var selector = createReadableSelector(selectedElement);

    hideResizeHandles();

    selectedElement.remove();

    // Clear selection state
    selectedElement = null;
    originalStyles = {};
    originalText = '';

    sendToParent('INSPECTOR_ELEMENT_DELETED', {
      selector: selector,
      success: true,
    });
  } catch (error) {
    sendToParent('INSPECTOR_ELEMENT_DELETED', {
      selector: '',
      success: false,
      error: error.message,
    });
  }
}

// ============================================================
// Message Dispatch (single listener, lookup map)
// ============================================================

var commandHandlers = {
  INSPECTOR_ACTIVATE: function (data) {
    setInspectorActive(data.active);
  },
  INSPECTOR_EDIT_STYLE: function (data) {
    handleStyleEdit(data.property, data.value);
  },
  INSPECTOR_EDIT_TEXT: function (data) {
    handleTextEdit(data.text);
  },
  INSPECTOR_SELECT_BY_SELECTOR: function (data) {
    handleSelectBySelector(data.selector);
  },
  INSPECTOR_REVERT: function () {
    handleRevert();
  },
  INSPECTOR_BULK_STYLE: function (data) {
    handleBulkStyleEdit(data.selector, data.property, data.value);
  },
  INSPECTOR_BULK_REVERT: function (data) {
    handleBulkRevert(data.selector);
  },
  INSPECTOR_COUNT_ELEMENTS: function (data) {
    handleCountElements(data.selector);
  },
  INSPECTOR_DELETE_ELEMENT: function () {
    handleDeleteElement();
  },
};

window.addEventListener('message', function (event) {
  var data = event.data;

  if (!data || !data.type) {
    return;
  }

  var handler = commandHandlers[data.type];

  if (handler) {
    handler(data);
  }
});

// ============================================================
// Ready signal
// ============================================================

sendToParent('INSPECTOR_READY', {});
