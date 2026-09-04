# backspace should erase the bullet if it's the last empty line

- applyState:

```md
- |
```

- keydown: `Backspace`
- assertState:

```md
|
```

# backspace should work as regular if it's first line without children

- applyState:

```md
- |one
- two
```

- keydown: `Backspace`
- assertState:

```md
-|one
- two
```

# backspace should do nothing if it's first line with children

- applyState:

```md
- |one
  - two
```

- keydown: `Backspace`
- assertState:

```md
- |one
  - two
```

# backspace should remove symbol if it isn't empty line

- applyState:

```md
- qwe|
```

- keydown: `Backspace`
- assertState:

```md
- qw|
```

# backspace should erase the bullet if the item is empty

- applyState:

```md
- one
- |
```

- keydown: `Backspace`
- assertState:

```md
- one
|
```

# backspace should erase the checkbox if the item is empty

- applyState:

```md
- one
- [ ] |
```

- keydown: `Backspace`
- assertState:

```md
- one
|
```

# backspace should erase the bullet of a nested empty item

- applyState:

```md
- one
  - |
```

- keydown: `Backspace`
- assertState:

```md
- one
|
```

# backspace should not erase the bullet if the empty item has children

- applyState:

```md
- |
  - two
```

- keydown: `Backspace`
- assertState:

```md
- |
  - two
```

# backspace should remove note line if it's empty

- applyState:

```md
- one
  |
```

- keydown: `Backspace`
- assertState:

```md
- one|
```

# backspace should remove note line if it isn't empty and cursor on the line start

- applyState:

```md
- one
  |two
```

- keydown: `Backspace`
- assertState:

```md
- one|two
```
