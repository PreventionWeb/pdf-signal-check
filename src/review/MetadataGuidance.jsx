import React from 'react';

/** Vendor help is opened only by the user; no document data is included in these links. */
export function MetadataGuidance({ headingLevel = 'h3' }) {
  const Heading = headingLevel;
  return <section className="metadata-guidance">
    <Heading>How to add document information</Heading>
    <p>Start with the full publication title. The filename and the title printed on the page do not fill in the saved title. Add a short subject description and relevant keywords where needed.</p>
    <ul>
      <li><strong>Word:</strong> open the document properties and set the Title. On Windows, use File → Info → Properties → Advanced Properties → Summary. On Mac, use File → Properties → Summary. <a href="https://support.microsoft.com/en-us/office/collab-files/view-or-change-the-properties-for-an-office-file" target="_blank" rel="noopener noreferrer">Word guidance for Windows</a> · <a href="https://support.microsoft.com/en-gb/office/inspect-document-b0088a7a-d482-4b87-b762-7c94c7c71e23" target="_blank" rel="noopener noreferrer">Word guidance for Mac</a>.</li>
      <li><strong>Acrobat:</strong> open Document properties → Description and fill in Title, Subject and Keywords, then save the PDF. <a href="https://helpx.adobe.com/uk/acrobat/desktop/edit-documents/edit-pdf-properties/pdf-properties.html" target="_blank" rel="noopener noreferrer">Acrobat document properties guidance</a>.</li>
      <li><strong>InDesign:</strong> use File → File Info to enter the document title, description and keywords. <a href="https://helpx.adobe.com/au/indesign/desktop/save-export-and-publish/save-and-export/add-edit-file-metadata.html" target="_blank" rel="noopener noreferrer">InDesign metadata guidance</a>.</li>
    </ul>
    <p>Save or export an updated PDF, then choose that file here. If you only have the PDF and cannot edit it, ask its publisher or author for a corrected copy. Adding metadata does not repair missing tags or other document problems.</p>
  </section>;
}
