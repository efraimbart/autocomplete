class AutocompleteManager {
    constructor() {
      this.DOUBLE_CLICK_THRESHOLD = 300;
      this.WORD_ACCEPT_DELAY = 350;
      this.wordList = [
        "the", "be", "to", "of", "and", "a", "in", "that", "have", "I",
        "it", "for", "not", "on", "with", "he", "as", "you", "do", "at",
        "this", "but", "his", "by", "from", "they", "we", "say", "her", "she",
        "or", "an", "will", "my", "one", "all", "would", "there", "their", "what",
        "so", "up", "out", "if", "about", "who", "get", "which", "go", "me",
        "when", "make", "can", "like", "time", "no", "just", "him", "know", "take",
        "people", "into", "year", "your", "good", "some", "could", "them", "see", "other",
        "than", "then", "now", "look", "only", "come", "its", "over", "think", "also",
        "back", "after", "use", "two", "how", "our", "work", "first", "well", "way",
        "even", "new", "want", "because", "any", "these", "give", "day", "most", "us"
      ];
      
      this.currentTextarea = null;
      this.currentSuggestion = '';
      this.currentAbortController = null;
      this.remainingSuggestion = '';
      this.isSimulatedMode = false;
      this.isTabHeld = false;
      this.lastTabPressTime = 0;
      this.wordAcceptInterval = null;
  
      this.overlay = null;
      this.resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
          if (entry.target === this.currentTextarea) {
            this.positionOverlay();
          }
        }
      });
  
      this.initEventListeners();
      this.initAISession();
    }
  
    async initAISession() {
      try {
        const capabilities = await window.ai?.assistant.capabilities();
        this.isSimulatedMode = capabilities.available !== 'readily';
        if (this.isSimulatedMode) {
          console.warn('window.ai is not available, switching to simulated mode');
        }
      } catch (error) {
        console.error('Failed to initialize AI session, switching to simulated mode:', error);
        this.isSimulatedMode = true;
      }
    }
  
    initEventListeners() {
      document.addEventListener('focusin', this.handleFocusIn.bind(this));
      document.addEventListener('focusout', this.handleFocusOut.bind(this));
      document.addEventListener('input', this.handleInput.bind(this));
      document.addEventListener('keydown', this.handleKeyDown.bind(this));
      document.addEventListener('keyup', this.handleKeyUp.bind(this));
    }
  
    handleFocusIn(e) {
      if (e.target.tagName.toLowerCase() === 'textarea') {
        this.currentTextarea = e.target;
        this.createSuggestionOverlay();
        this.resizeObserver.observe(e.target);
      }
    }
  
    handleFocusOut(e) {
      if (e.target.tagName.toLowerCase() === 'textarea') {
        this.currentTextarea = null;
        this.removeSuggestionOverlay();
        this.resizeObserver.unobserve(e.target);
      }
    }
  
    handleInput(e) {
      if (e.target.tagName.toLowerCase() === 'textarea') {
        this.handleAutocomplete(e.target);
      }
    }
  
    handleKeyDown(e) {
      if (e.key === 'Tab' && this.currentTextarea) {
        e.preventDefault();
        const now = Date.now();
        if (!this.isTabHeld) {
          this.isTabHeld = true;
          if (now - this.lastTabPressTime < this.DOUBLE_CLICK_THRESHOLD) {
            this.acceptEntireAutocomplete();
          } else {
            this.acceptFirstWordOfAutocomplete();
            this.wordAcceptInterval = setInterval(() => {
              if (this.isTabHeld) {
                this.acceptNextWord();
              } else {
                clearInterval(this.wordAcceptInterval);
              }
            }, this.WORD_ACCEPT_DELAY);
          }
        }
        this.lastTabPressTime = now;
      }
    }
  
    handleKeyUp(e) {
      if (e.key === 'Tab') {
        this.isTabHeld = false;
        clearInterval(this.wordAcceptInterval);
        if (this.currentTextarea) {
          this.handleAutocomplete(this.currentTextarea);
        }
      }
    }
  
    async handleAutocomplete(textarea) {
      if (this.isTabHeld) return;
  
      if (this.currentAbortController) {
        this.currentAbortController.abort();
      }
      this.currentAbortController = new AbortController();
  
      this.currentSuggestion = '';
      this.hideSuggestion();
  
      try {
        const text = textarea.value;
        const cursorPosition = textarea.selectionStart;
        const suggestion = await this.getAutocompleteSuggestion(text, cursorPosition, this.currentAbortController.signal);
  
        if (suggestion && !this.isTabHeld) {
          this.displaySuggestion(textarea, suggestion);
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error in handleAutocomplete:', error);
        }
      } finally {
        this.currentAbortController = null;
      }
    }
  
    async getAutocompleteSuggestion(text, cursorPosition, signal) {
      if (this.isSimulatedMode) {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 400 + 100));
        return this.generateRandomSentence(text);
      }
  
      let aiSession = null;
      try {
        aiSession = await window.ai.assistant.create();
        
        const prompt = `Your task is to autocomplete the given sentence. Your response should be a JSON array containing a single string with the autocomplete suggestion, beginning from where the input text left off. If you can't provide a meaningful autocomplete, return [""].
  
  Input: "${text}"
  
  Response format: ["sentence completion suggestion"]`;
  
        const response = await aiSession.prompt(prompt, { signal });
        const suggestionArray = JSON.parse(response);
        return suggestionArray[0] || '';
      } catch (error) {
        if (error.name === 'AbortError') {
          throw error;
        }
        console.error('Error getting autocomplete suggestion:', error);
        return '';
      } finally {
        if (aiSession) {
          await aiSession.destroy();
        }
      }
    }
  
    createSuggestionOverlay() {
      this.overlay = document.createElement('div');
      this.overlay.id = 'ai-autocomplete-overlay';
      this.overlay.style.cssText = `
        position: absolute;
        pointer-events: none;
        color: #999;
        background: transparent;
        font-family: ${getComputedStyle(this.currentTextarea).fontFamily};
        font-size: ${getComputedStyle(this.currentTextarea).fontSize};
        line-height: ${getComputedStyle(this.currentTextarea).lineHeight};
        padding: ${getComputedStyle(this.currentTextarea).padding};
        white-space: pre-wrap;
        overflow-wrap: break-word;
      `;
      document.body.appendChild(this.overlay);
      this.positionOverlay();
    }
  
    positionOverlay() {
      if (!this.overlay || !this.currentTextarea) return;
      const rect = this.currentTextarea.getBoundingClientRect();
      this.overlay.style.left = `${rect.left + window.scrollX}px`;
      this.overlay.style.top = `${rect.top + window.scrollY}px`;
      this.overlay.style.width = `${this.currentTextarea.offsetWidth}px`;
      this.overlay.style.height = `${this.currentTextarea.offsetHeight}px`;
    }
  
    removeSuggestionOverlay() {
      if (this.overlay) {
        this.overlay.remove();
        this.overlay = null;
      }
    }
  
    displaySuggestion(textarea, suggestion) {
      if (!this.overlay) return;
  
      this.currentSuggestion = suggestion;
      this.remainingSuggestion = suggestion;
      const existingText = textarea.value;
      
      const spacer = existingText.endsWith(' ') ? '' : ' ';
      
      this.overlay.innerHTML = `<span style="color: transparent;">${existingText}</span><span>${spacer}${suggestion}</span>`;
      this.positionOverlay();
    }
  
    hideSuggestion() {
      if (this.overlay) {
        this.overlay.textContent = '';
      }
    }
  
    acceptFirstWordOfAutocomplete() {
      if (!this.currentTextarea || !this.currentSuggestion) return;
      const words = this.currentSuggestion.split(' ');
      if (words.length > 0) {
        const spacer = this.currentTextarea.value.endsWith(' ') ? '' : ' ';
        this.currentTextarea.value += spacer + words[0] + ' ';
        this.remainingSuggestion = words.slice(1).join(' ');
        this.currentSuggestion = this.remainingSuggestion;
        this.handleAutocomplete(this.currentTextarea);
      }
    }
  
    acceptEntireAutocomplete() {
      if (!this.currentTextarea || !this.remainingSuggestion) return;
      const spacer = this.currentTextarea.value.endsWith(' ') ? '' : ' ';
      this.currentTextarea.value += spacer + this.remainingSuggestion;
      this.currentSuggestion = '';
      this.remainingSuggestion = '';
      this.handleAutocomplete(this.currentTextarea);
    }
  
    acceptNextWord() {
      if (!this.currentTextarea || !this.remainingSuggestion) return;
      const words = this.remainingSuggestion.split(' ');
      if (words.length > 0) {
        const spacer = this.currentTextarea.value.endsWith(' ') ? '' : ' ';
        this.currentTextarea.value += spacer + words[0] + ' ';
        this.remainingSuggestion = words.slice(1).join(' ');
        this.currentSuggestion = this.remainingSuggestion;
        if (this.remainingSuggestion === '') {
          this.handleAutocomplete(this.currentTextarea);
        }
      }
    }
  
    generateRandomSentence(inputText) {
      const words = inputText.split(' ');
      const lastWord = words[words.length - 1];
      const sentenceLength = Math.floor(Math.random() * 15) + 1;
      let sentence = lastWord;
      
      for (let i = 0; i < sentenceLength; i++) {
        const randomWord = this.wordList[Math.floor(Math.random() * this.wordList.length)];
        sentence += ' ' + randomWord;
      }
      
      return sentence.slice(lastWord.length).trim();
    }
  }
  
  // Initialize
  const autocompleteManager = new AutocompleteManager();
  
  // Clean up
  window.addEventListener('beforeunload', () => {
    // No cleanup needed as aiSession is destroyed after each use
  });