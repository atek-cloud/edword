import { LitElement, html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import codeBranch from '../icons/code-branch.js'
import clock from '../icons/clock.js'
import cog from '../icons/cog.js'
import document from '../icons/document.js'

@customElement('p2-nav')
export class Nav extends LitElement {
  render () {
    return html`
      <div class="item active">${document}</div>
      <div class="item fa">${codeBranch}</div>
      <div class="item">${clock}</div>
      <div class="item">${cog}</div>
    `
  }
  static styles = css`
    :host {
      display: block;
      font-size: 13px;
      background: var(--background-dark);
      padding: 0.25rem 0;
    }
    
    .item {
      text-align: center;
      padding: 9px 8px 7px;
      color: var(--color-dark);
      border-left: 3px solid transparent;
      margin-bottom: 2px;
    }

    .item:hover {
      color: var(--color-default);
    }
    
    .item.active {
      color: var(--color-default);
      border-left: 3px solid var(--border-light);
    }

    svg {
      width: 22px;
    }

    .item.fa svg {
      width: 15px;
    }
  `
}