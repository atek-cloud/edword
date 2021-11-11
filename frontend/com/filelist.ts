import { LitElement, html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import codeBranch from '../icons/code-branch'

@customElement('p2-filelist')
export class Filelist extends LitElement {
  render () {
    return html`
      <div class="header">Untitled Repo</div>
      <div class="subheader">${codeBranch} main</div>
      <div class="item">index.txt</div>
      <div class="item active">thing.txt</div>
      <div class="item">foo.txt</div>
    `
  }
  static styles = css`
    :host {
      display: block;
      font-size: 13px;
      background: var(--background-dark);
      padding: 0.25rem 0;
    }

    svg {
      display: inline;
      width: 8px;
    }

    .header {
      text-transform: uppercase;
      font-weight: bold;
      font-size: 11px;
      color: var(--color-active);
      padding: 0.2rem 0.7rem;
    }

    .subheader {
      padding: 4px 12px;
      color: var(--color-dark);
    }
    
    .item {
      padding: 0.25rem 0.75rem;
    }
    
    .item.active {
      background: var(--background-light);
    }

  `
}