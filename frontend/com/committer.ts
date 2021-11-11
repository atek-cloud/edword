import { LitElement, html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'

@customElement('p2-committer')
export class Committer extends LitElement {
  render () {
    return html`
      No changes to commit
    `
  }

  static styles = css`
    :host {
      display: block;
      border-top: 1px solid var(--border-default);
      font-size: 12px;
      padding: 0.8rem 1rem;
      background: var(--background-dark);
      color: var(--color-dark);
    }
  `
}