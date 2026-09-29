import { TextInput, type TextInputProps } from "react-native";

/**
 * A `TextInput` preconfigured for plain, literal text entry (e.g. keys or
 * hand-typed JSON) instead of prose. `keyboardType="ascii-capable"` is what
 * disables iOS smart quotes, since UIKit's default smart-quotes behavior is
 * keyed off the keyboard type; autocorrect, spell check, and
 * autocapitalization are disabled alongside it so typed JSON stays valid.
 * Defaults are applied before `props` so callers can still override any of
 * them.
 */
export default function PlainTextInput(props: TextInputProps) {
  return (
    <TextInput
      keyboardType="ascii-capable"
      autoCorrect={false}
      spellCheck={false}
      autoCapitalize="none"
      {...props}
    />
  );
}
