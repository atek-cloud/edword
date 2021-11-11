import { LitElement, html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { Toolbar } from './toolbar.js'

@customElement('p2-tabs')
export class Tabs extends Toolbar {
  render () {
    return html`
      <a class="active">thing.txt</a><a>index.txt</a><a>foo.txt</a>
    `
  }
}