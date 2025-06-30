// Dependency tracker
const targetMap = new WeakMap()
let activeEffect = null
const effectStack = []

function reactive(target) {
  return createReactiveObject(target)
}

function createReactiveObject(target) {
  if (typeof target !== 'object' || target === null) return target

  return new Proxy(target, {
    get(obj, key, receiver) {
      const result = Reflect.get(obj, key, receiver)
      track(obj, key)

      // Deep reactive
      if (typeof result === 'object' && result !== null) {
        return reactive(result)
      }

      return result
    },
    set(obj, key, value, receiver) {
      const oldValue = obj[key]
      const result = Reflect.set(obj, key, value, receiver)

      if (oldValue !== value) {
        trigger(obj, key)
      }

      return result
    },
    deleteProperty(obj, key) {
      const hadKey = key in obj
      const result = Reflect.deleteProperty(obj, key)
      if (hadKey) {
        trigger(obj, key)
      }
      return result
    }
  })
}

function track(target, key) {
  if (!activeEffect) return

  let depsMap = targetMap.get(target)
  if (!depsMap) {
    depsMap = new Map()
    targetMap.set(target, depsMap)
  }

  let dep = depsMap.get(key)
  if (!dep) {
    dep = new Set()
    depsMap.set(key, dep)
  }

  if (!dep.has(activeEffect)) {
    dep.add(activeEffect)
    activeEffect.deps.push(dep)
  }
}

function trigger(target, key) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return

  const dep = depsMap.get(key)
  if (dep) {
    const effects = new Set(dep)
    effects.forEach(effect => {
      if (effect !== activeEffect) {
        effect()
      }
    })
  }
}

function effect(fn) {
  const reactiveEffect = () => {
    cleanup(reactiveEffect)
    activeEffect = reactiveEffect
    effectStack.push(reactiveEffect)
    fn()
    effectStack.pop()
    activeEffect = effectStack[effectStack.length - 1]
  }

  reactiveEffect.deps = []
  reactiveEffect()
  return reactiveEffect
}

function cleanup(effect) {
  const { deps } = effect
  for (let i = 0; i < deps.length; i++) {
    deps[i].delete(effect)
  }
  effect.deps.length = 0
}

function computed(getter) {
  let value
  let dirty = true

  const computedEffect = effect(() => {
    value = getter()
    dirty = false
  })

  return {
    get value() {
      if (dirty) {
        computedEffect()
      }
      return value
    }
  }
}

function watch(source, callback) {
  let oldValue

  const getter = typeof source === 'function' ? source : () => traverse(source)

  effect(() => {
    const newValue = getter()
    if (newValue !== oldValue) {
      callback(newValue, oldValue)
      oldValue = newValue
    }
  })
}

function traverse(value, seen = new Set()) {
  if (typeof value !== 'object' || value === null || seen.has(value)) return value
  seen.add(value)

  for (const key in value) {
    traverse(value[key], seen)
  }

  return value
}
