import { LitElement, html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import './com/titlebar.js'
import './com/nav.js'
import './com/filelist.js'
import './com/committer.js'
import './com/tabs.js'
import './com/editor.js'

@customElement('p2-app')
class App extends LitElement {
  render () {
    return html`
      <div class="col1">
        <p2-nav class="flex-1"></p2-nav>
      </div>
      <div class="col2">
        <p2-filelist class="flex-1"></p2-filelist>
        <p2-committer></p2-committer>
      </div>
      <div class="col3">
        <p2-tabs></p2-tabs>
        <p2-editor></p2-editor>
      </div>
    `
  }

  static styles = css`
    :host {
      display: flex;
    }

    .col1 {
      flex: 0 0 40px;
      display: flex;
      flex-direction: column;
      border-right: 1px solid var(--border-default);
    }

    .col2 {
      flex: 0 0 200px;
      display: flex;
      flex-direction: column;
      border-right: 1px solid var(--border-default);
    }

    .col3 {
      flex: 1;
    }

    .flex-1 {
      flex: 1;
    }
  `
}