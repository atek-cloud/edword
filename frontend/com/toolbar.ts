import { LitElement, html, css } from 'lit'

export class Toolbar extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-size: 13px;
      background: var(--background-dark);
      color: var(--color-dark);
      border-bottom: 1px solid var(--border-default);
    }
    
    a {
      display: inline-block;
      padding: 0.3rem 0.5rem;
      border-right: 1px solid var(--border-default);
    }
    
    a:hover {
      background: var(--background-default);
    }
    
    a.active {
      color: var(--color-active);
      background: var(--background-default);
    }
  `
}