// Keep existing story links working after the player moved onto About.
const target = new URL('./', document.baseURI);
target.search = location.search;
target.hash = 'about-video';
location.replace(target.href);
