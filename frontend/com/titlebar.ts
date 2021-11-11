import { LitElement, html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'

@customElement('p2-titlebar')
export class Titlebar extends LitElement {
  render () {
    return html`
      thing.txt &mdash; Untitled Repo
    `
  }

  static styles = css`
    :host {
      display: block;
      height: 29px;
      line-height: 23px;
      font-size: 13px;
      background: var(--background-dark);
      color: var(--color-default);
      border-bottom: 1px solid var(--border-default);
      text-align: center;
      -webkit-app-region: drag;
      user-select: none;
    }
  `
}