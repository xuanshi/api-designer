'use strict';

/* globals CodeMirror */

angular.module('codeFolding', ['raml', 'lightweightParse'])
  .factory('isArrayElement', function (isArrayStarter, getParentLineNumber, getFirstChildLine){
    return function(cm, lineNumber){
      var line = cm.getLine(lineNumber);
      if(isArrayStarter(line)) {
        return true;
      }

      var parentLineNumber = getParentLineNumber(cm, lineNumber);
      var firstChild = getFirstChildLine(cm, parentLineNumber);

      return isArrayStarter(firstChild);
    };
  })
  .factory('hasChildren', function(ramlHint){
    return function (cm){
      var editorState = ramlHint.getEditorState(cm);

      var potentialChildren = ramlHint.getScopes(cm).scopeLevels[editorState.currLineTabCount > 0 ? editorState.currLineTabCount + 1 : 1], firstChild;

      if(potentialChildren) {
        firstChild = potentialChildren.filter(function(line) {
          return line === editorState.start.line + 1;
        }).pop();
      }

      return !!firstChild;
    };
  })
  .factory('getParentLineNumber', function (getScopes, getEditorTextAsArrayOfLines, getLineIndent, isArrayStarter) {
    var getParentLineNumber = function (cm, lineNumber) {
      var tabCount = getLineIndent(cm.getLine(lineNumber)).tabCount;

      var potentialParents = getScopes(getEditorTextAsArrayOfLines(cm)).scopeLevels[tabCount > 0 ? (tabCount - 1) : 0];
      var parent = null;

      if (potentialParents) {
        parent = potentialParents.filter(function (line) {
          return line < lineNumber;
        }).pop();
      }

      if(isArrayStarter(cm.getLine(parent))) {
        return getParentLineNumber(cm, parent);
      }

      return parent;
    };

    return getParentLineNumber;
  })
  .factory('getParentLine', function (getParentLineNumber) {
    return function (cm, lineNumber) {
      var parentLineNumber = getParentLineNumber(cm, lineNumber);
      return cm.getLine(parentLineNumber);
    };
  })
  .factory('getFirstChildLineNumber', function (getScopes, getLineIndent, getEditorTextAsArrayOfLines) {
    return function (cm, lineNumber){
      var scopes = getScopes(getEditorTextAsArrayOfLines(cm));

      var scopesByLine = scopes.scopesByLine[lineNumber];
      if(scopesByLine && scopesByLine.length >= 2) {
        var firstChild = scopes.scopesByLine[lineNumber][1];
        if(firstChild) {
          return firstChild[0];
        }
      }
    };
  })
  .factory('getFirstChildLine', function (getFirstChildLineNumber){
    return function(cm, lineNumber) {
      var firstChildLineNumber = getFirstChildLineNumber(cm, lineNumber);
      return cm.getLine(firstChildLineNumber);
    };
  })
  .factory('getFoldRange', function (getScopes, getEditorTextAsArrayOfLines, getLineIndent) {
    return function (cm, start) {
      var scopes = getScopes(getEditorTextAsArrayOfLines(cm)),
          line = start.line,
          currentLineLevel,
          currentLineScope,
          currentLineIndexInScope,
          endLine,
          parentLineScope,
          parentEndLine,
          parentLineIndexInScope;

      if (scopes.scopesByLine[line - 1]) {
        currentLineLevel = scopes.scopesByLine[line - 1].tabCount;
        currentLineScope = scopes.scopeLevels[currentLineLevel];

        // Find the current line in the scope
        currentLineIndexInScope = currentLineScope.indexOf(line);

        //while (currentLineIndexInScope === -1 && currentLineLevel < cm.lineCount() ) {
        //  currentLineLevel++;
        //  currentLineScope = scopes.scopeLevels[currentLineLevel];

        //  // Find the current line in the scope
        //  currentLineIndexInScope = currentLineScope.indexOf(line);
        //}

        if (currentLineLevel === cm.lineCount() ) {
          alert('this should never happen');
        }

        var parentLineNumber = scopes.scopesByLine[line - 1].parent;
        if (parentLineNumber) {
          var parentLineLevel = scopes.scopesByLine[parentLineNumber].tabCount;
          parentLineScope = scopes.scopeLevels[parentLineLevel];

          parentLineIndexInScope = parentLineScope.indexOf(parentLineNumber);
        } else {
          parentLineScope = [];
          parentLineIndexInScope = 0;
        }

        // Get following element line
        endLine = currentLineScope.slice(currentLineIndexInScope + 1, currentLineIndexInScope + 2);
        parentEndLine = parentLineScope.slice(parentLineIndexInScope + 1, parentLineIndexInScope + 2);

        if (endLine.length) {
          endLine = endLine[0] - 1;
        }
        
        if (parentEndLine.length) {
          parentEndLine = parentEndLine[0] - 1;
        } else {
          parentEndLine = endLine;
        }

        if (endLine > parentEndLine) {
          endLine = parentEndLine;
        } else if (parentEndLine <= endLine) {
          endLine = endLine;
        }
        
        if (endLine <= line) {
          return;
        }

        debugger;

        // If endLine not found it must be the last line of the buffer
        //debugger;
        //endLine = cm.lineCount() - 1;
        
        return {
          from: CodeMirror.Pos(line, cm.getLine(line).length),
          to: CodeMirror.Pos(endLine, cm.getLine(endLine).length)
        };
      }
    };
  });
