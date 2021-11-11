interface EmitOpts {
  bubbles?: boolean
  composed?: boolean
  detail?: any
}

export function emit (el: Element, evt: string, opts: EmitOpts = {}) {
  opts.bubbles = ('bubbles' in opts) ? opts.bubbles : true
  opts.composed = ('composed' in opts) ? opts.composed : true
  el.dispatchEvent(new CustomEvent(evt, opts))
}
