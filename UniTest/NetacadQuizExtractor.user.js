// ==UserScript==
// @name         Cisco NetAcad Quiz Extractor
// @version      1.0.2
// @description  Allows to extract definitions of Cisco Networking Academy quiz questions into a text or XML file for further processing.
// @namespace    https://github.com/MJakubec/UserScripts
// @author       Michal Jakubec
// @date         2023-03-14
// @updateURL    https://github.com/MJakubec/UserScripts/raw/main/UniTest/NetacadQuizExtractor.user.js
// @downloadURL  https://github.com/MJakubec/UserScripts/raw/main/UniTest/NetacadQuizExtractor.user.js
// @require      https://ajax.aspnetcdn.com/ajax/jQuery/jquery-3.6.4.min.js#sha256=a0fe8723dcf55da64d06b25446d0a8513e52527c45afcb37073465f9c6f352af
// @require      https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.4/FileSaver.min.js#sha256=1433b8feb185bd8e81db7d2d1ea7330140531b72158300f8e26c98df1e853b21
// @match        https://contenthub.netacad.com/ensa-dl/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        GM_registerMenuCommand
// @grant        GM_download
// ==/UserScript==

(() => {
  'use strict';

  const unknownQuestionErrorMessage = 'An unknown question type has been detected in the quiz.';

  const singleChoiceTypeMark = 'SingleChoice';
  const multipleChoiceTypeMark = 'MultipleChoice';
  const openTextTypeMark = 'OpenText';
  const correctChoiceFlag = '@';

  const outputTextLinesDelimiter = '\r\n';
  const outputTextMimeTypeAndEncoding = 'text/plain;charset=utf-8';
  const outputTextFileExtension = '.txt';

  const processingInstructionName = "xml";
  const processingInstructionAttributes = 'version="1.0" encoding="UTF-8"';
  const rootElementName = 'Questions';
  const questionElementName = 'Question';
  const propositionElementName = 'Proposition';
  const definitionElementName = 'Definition';
  const definitionLineElementName = 'Line';
  const questionTypeAttributeName = 'Type';
  const outputXmlMimeTypeAndEncoding = 'text/xml;charset=utf-8';
  const outputXmlFileExtension = '.xml';

  const questionBlockSelector = "li[class='question-container']";
  const propositionSelector = "div[class~='cyu-question'] p";
  const singleChoiceDefinitionSelector = "label[class='radio']";
  const multipleChoiceDefinitionSelector = "label[class='checkbox']";
  const choiceStateAttributeName = 'data-answer';
  const choiceStateCorrectValue = 'correct';
  const choiceTextSelector = 'p';

  class Question
  {
    constructor(type, proposition, definitionLines)
    {
      this.type = type;
      this.proposition = proposition;
      this.definitionLines = definitionLines;
    }

    appendToXml(xml)
    {
      const baseTag = xml.createElement(questionElementName);
      baseTag.setAttribute(questionTypeAttributeName, this.type);

      const propositionTag = xml.createElement(propositionElementName);
      propositionTag.textContent = this.proposition;
      baseTag.appendChild(propositionTag);

      const definitionTag = xml.createElement(definitionElementName);

      for (const line of this.definitionLines)
      {
        const lineTag = xml.createElement(definitionLineElementName);
        lineTag.textContent = line;
        definitionTag.appendChild(lineTag);
      }

      baseTag.appendChild(definitionTag);

      xml.documentElement.appendChild(baseTag);
    }

    appendToText(texts)
    {
      texts.push(this.type);
      texts.push(this.proposition);
      for (const line of this.definitionLines)
        texts.push(line);
    }
  }

  class Parser
  {
    constructor()
    {
      this.serializer = new XMLSerializer();
    }

    normalizeText(text)
    {
      return text.replace(/[\u00A0\u200B]/g, "")
    }

    processQuestionBlock(index, element)
    {
      const query = $(element);
      const proposition = this.normalizeText(query.find(propositionSelector).text());

      let definitions = query.find(singleChoiceDefinitionSelector);
      let type = singleChoiceTypeMark;

      if (definitions.length == 0)
      {
        definitions = query.find(multipleChoiceDefinitionSelector);
        type = multipleChoiceTypeMark;

        if (definitions.length == 0)
        {
          alert(unknownQuestionErrorMessage);
          throw false;
        }
      }

      const definitionLines = new Array();

      definitions.each((index, element) => {
        const query = $(element);
        let line = this.normalizeText(query.find(choiceTextSelector).text());

        let state = query.attr(choiceStateAttributeName)
        let isCorrect = (state == choiceStateCorrectValue);
        line = (isCorrect ? correctChoiceFlag : "") + line;

        definitionLines.push(line);
      });

      const question = new Question(type, proposition, definitionLines);
      this.questions.push(question);
    }

    parsePageMarkup()
    {
      this.questions = new Array();
      const root = $(questionBlockSelector);
      root.each(this.processQuestionBlock.bind(this));
    }

    serializeToXml()
    {
      const xml = document.implementation.createDocument(null, rootElementName);
      const instruction = xml.createProcessingInstruction(processingInstructionName, processingInstructionAttributes);
      xml.insertBefore(instruction, xml.firstChild);

      for (const question of this.questions)
        question.appendToXml(xml);

      this.output = this.serializer.serializeToString(xml);
    }

    serializeToText()
    {
      this.texts = new Array();

      for (const question of this.questions)
      {
        question.appendToText(this.texts);
        this.texts.push("");
      }

      this.output = this.texts.join(outputTextLinesDelimiter);
    }

    downloadAsXml()
    {
      var fileName = document.title + outputXmlFileExtension;
      var blob = new Blob([this.output], { type: outputXmlMimeTypeAndEncoding });
      world.saveAs(blob, fileName);
    }

    downloadAsText()
    {
      var fileName = document.title + outputTextFileExtension;
      var blob = new Blob([this.output], { type: outputTextMimeTypeAndEncoding });
      world.saveAs(blob, fileName);
    }

    execute(storeAsXml)
    {
      this.parsePageMarkup();

      if (storeAsXml)
      {
        this.serializeToXml();
        this.downloadAsXml();
      }
      else
      {
        this.serializeToText();
        this.downloadAsText();
      }
    }
  }

  const world = this;
  const parser = new Parser();

  const menuCommandExportToTextId = GM_registerMenuCommand("Export to Text file", (() => { parser.execute(false); }), "t");
  const menuCommandExportToXmlId = GM_registerMenuCommand("Export to XML file", (() => { parser.execute(true); }), "x");
})();