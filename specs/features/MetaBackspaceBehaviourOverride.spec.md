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

# cmd+backspace should erase the bullet if content is already empty

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
- one
|
```

# cmd+backspace should erase the whole line of a checkbox with text

- platform: `darwin`
- applyState:

```md
- one
- [ ] two|
```

- keydown: `Cmd-Backspace`
- assertState:

```md
- one
|
```

# cmd+backspace should erase the checkbox if the item is empty

- platform: `darwin`
- applyState:

```md
- one
- [ ] |
```

- keydown: `Cmd-Backspace`
- assertState:

```md
- one
|
```

# cmd+backspace should erase the bullet of the last empty line

- platform: `darwin`
- applyState:

```md
- |
```

- keydown: `Cmd-Backspace`
- assertState:

```md
|
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
