# cmd+backspace should remove content only

- platform: `darwin`
- applyState:

```md
- one
- two|
```

- keydown: `Cmd-Backspace`
- assertState:

```md
- one
- |
```

# cmd+backspace should remove content only in notes

- platform: `darwin`
- applyState:

```md
- one
  two|
```

- keydown: `Cmd-Backspace`
- assertState:

```md
- one
  |
```

# cmd+backspace should remove list item if content is already empty

- platform: `darwin`
- applyState:

```md
- one
- two|
```

- keydown: `Cmd-Backspace`
- keydown: `Cmd-Backspace`
- assertState:

```md
- one|
```

# cmd+backspace should remove note line if content is already empty

- platform: `darwin`
- applyState:

```md
- one
  two|
```

- keydown: `Cmd-Backspace`
- keydown: `Cmd-Backspace`
- assertState:

```md
- one|
```

# cmd+backspace should do nothing if it's first line with children

- platform: `darwin`
- applyState:

```md
- |one
  - two
```

- keydown: `Cmd-Backspace`
- assertState:

```md
- |one
  - two
```
