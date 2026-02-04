# tealium-prism-react-native

React Native wrapper for Tealium Prism mobile SDKs

## Installation

```sh
npm install tealium-prism-react-native
```

## Usage

```js
import { multiply } from 'tealium-prism-react-native';

// ...

const result = multiply(3, 7);
```

## Development Setup

### Prerequisites

This project requires Ruby 3.3.10. We recommend using [rbenv](https://github.com/rbenv/rbenv) to manage Ruby versions.

1. **Install rbenv** (if not already installed):
   ```sh
   brew install rbenv ruby-build
   ```

2. **Add rbenv to your shell** (add to `~/.zshrc` or `~/.bash_profile`):
   ```sh
   eval "$(rbenv init - zsh)"
   ```

3. **Install Ruby 3.3.10**:
   ```sh
   rbenv install 3.3.10
   ```

The project includes `.ruby-version` files that will automatically use Ruby 3.3.10 when you're in the project directory.

### Running the Example App

1. **Install dependencies**:
   ```sh
   yarn install
   ```

2. **Install Ruby gems for the example app**:
   ```sh
   cd example
   bundle install
   ```

3. **Install iOS dependencies** (macOS only):
   ```sh
   cd ios
   bundle exec pod install
   cd ../..
   ```

4. **Run the example app**:
   
   For iOS:
   ```sh
   yarn example ios
   ```
   
   For Android:
   ```sh
   yarn example android
   ```

### Troubleshooting

#### Ruby Version Issues

If you see errors about Ruby version compatibility or missing gems, ensure you're using Ruby 3.3.10:

```sh
ruby -v  # Should show: ruby 3.3.10
```

If it shows a different version, rbenv should automatically switch when you enter the project directory (due to `.ruby-version`). If not, try:

```sh
rbenv shell 3.3.10
```

#### CocoaPods Issues

If `pod install` fails, try cleaning and reinstalling:

```sh
cd example
rm -rf ios/Pods ios/Podfile.lock
cd ios
bundle exec pod install
```

## Contributing

- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)
- [Code of conduct](CODE_OF_CONDUCT.md)

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
