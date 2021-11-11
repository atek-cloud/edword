import { LitElement, html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { EditorState, EditorView, basicSetup } from '@codemirror/basic-setup'
import { oneDark } from '@codemirror/theme-one-dark'
import { markdown } from '@codemirror/lang-markdown'

@customElement('p2-editor')
export class Editor extends LitElement {
  cm: EditorView|undefined = undefined

  firstUpdated () {
    // if (this.shadow)
    const container = this.renderRoot.querySelector('.cm-container')
    if (container) {
      this.cm = new EditorView({
        state: EditorState.create({
          extensions: [
            basicSetup,
            oneDark,
            // markdown(),
          ]
        }),
        root: (this.renderRoot as ShadowRoot),
        parent: container
      })
    }
  }


  render () {
    return html`
      <div class="cm-container"></div>
    `
  }

  static styles = css`   
    .cm-editor {
      height: calc(100vh - 60px);
    }
  `
}
