import './global.css';

console.log('hello');

window.addEventListener('load', init);

function init() {
  const el = document.getElementById('root');
  if (el === null) {
    return;
  }

  const message = 'one\n   two\n      three\n';

  el.innerHTML = `<span id="output" contenteditable="true" spellcheck="false">${message}</span>`;

  setTimeout(() => {
    const elOutput = document.getElementById('output');
    if (elOutput === null) {
      return;
    }
    elOutput.focus();
  }, 20);
}
