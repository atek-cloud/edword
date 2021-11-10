import { LitElement, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import { EditorState, EditorView, basicSetup } from '@codemirror/basic-setup'
import { ViewUpdate } from '@codemirror/view'
import { Text } from '@codemirror/text'
import { markdown } from '@codemirror/lang-markdown'
import { showPanel } from '@codemirror/panel'

interface Env {
  showHistory: boolean
}

@customElement('p2-toolbar')
class Toolbar extends LitElement {
  @property() env: Env = {showHistory: false}

  onEnvUpdate (env: Env) {
    this.env = env
  }

  onCmUpdate (doc: Text) {
    // TODO react to document
  }

  render () {
    return html`
      toolbar
      <button @click=${this.onToggleHistory}>${this.env.showHistory ? 'Hide History' : 'Show History'}</button>
    `
  }

  onToggleHistory (e: Event) {
    emit(this, 'toggle-history')
  }
}

@customElement('p2-editor')
class Editor extends LitElement {
  @property() env: Env = {showHistory: false}
  cm: EditorView|undefined = undefined

  createRenderRoot () {
    return this // no shadow dom
  }

  firstUpdated () {
    const container = this.querySelector('.cm-container')
    if (container) {
      this.cm = new EditorView({
        state: EditorState.create({
          extensions: [
            basicSetup,
            markdown(),
            showPanel.of(panel(Toolbar, true))
          ]
        }),
        parent: container
      })
    }
    this.env = {
      showHistory: false
    }
  }

  update (changedProperties: Map<string, any>) {
    super.update(changedProperties)
    if (changedProperties.has('env')) {
      this.toolbar?.onEnvUpdate(this.env)
    }
  }

  get toolbar (): Toolbar|null {
    return this.querySelector('p2-toolbar')
  }

  render () {
    return html`
      <div
        class="cm-container"
        @toggle-history=${this.onToggleHistory}
      ></div>
      <div class=${classMap({history: true, hidden: !this.env.showHistory})}>
        history todo
      </div>
    `
  }

  onToggleHistory (e: Event) {
    this.env = Object.assign({}, this.env, {
      showHistory: !this.env.showHistory
    })
  }
}

function panel (Cons: any, top: boolean) {
  return (view: EditorView) => {
    const el = new Cons()
    el.onCmUpdate(view.state.doc)
    const dom = document.createElement('div')
    dom.appendChild(el)
    return {
      top,
      dom,
      update (update: ViewUpdate) {
        if (update.docChanged)
          el.onCmUpdate(update.state.doc)
      }
    }
  }
}

interface EmitOpts {
  bubbles?: boolean
  composed?: boolean
  detail?: any
}

function emit (el: Element, evt: string, opts: EmitOpts = {}) {
  opts.bubbles = ('bubbles' in opts) ? opts.bubbles : true
  opts.composed = ('composed' in opts) ? opts.composed : true
  el.dispatchEvent(new CustomEvent(evt, opts))
}
