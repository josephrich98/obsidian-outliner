# Shift-Tab should outdent line

- applyState:

```md
- qwe
  - qwe|
```

- keydown: `Shift-Tab`
- assertState:

```md
- qwe
- qwe|
```

# Shift-Tab should outdent children

- applyState:

```md
- qwe
  - qwe|
    - qwe
```

- keydown: `Shift-Tab`
- assertState:

```md
- qwe
- qwe|
  - qwe
```

# Shift-Tab should outdent in case #144

- applyState:

```md
- qwe
  - qwe
    - qwe
  - qwe
  - qwe|
```

- keydown: `Shift-Tab`
- assertState:

```md
- qwe
  - qwe
    - qwe
  - qwe
- qwe|
```

# Shift-Tab should outdent an over-indented line by one step

- applyState:

```md
- qwe
      - qwe|
```

- keydown: `Shift-Tab`
- assertState:

```md
- qwe
    - qwe|
```

# Shift-Tab should remove the indent of a lone bullet

- applyState:

```md
    - qwe|
```

- keydown: `Shift-Tab`
- assertState:

```md
  - qwe|
```

# Shift-Tab should do nothing on an unindented lone bullet

- applyState:

```md
- qwe|
```

- keydown: `Shift-Tab`
- assertState:

```md
- qwe|
```

# Shift-Tab should outdent an over-indented line to the parent level when the free indentation is off

- setting: `freeIndent=false`
- applyState:

```md
- qwe
      - qwe|
```

- keydown: `Shift-Tab`
- assertState:

```md
- qwe
- qwe|
```
