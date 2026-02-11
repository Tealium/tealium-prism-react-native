# Tealium Prism React Native – Example

Example app for the Tealium Prism React Native SDK.

## Wymagania

- **Node.js** ≥ 20
- **Yarn** 4.x (używany w repo)
- **Android**: Android Studio, SDK 35, emulator lub urządzenie
- **iOS**: Xcode, CocoaPods, symulator lub urządzenie

## Uruchomienie z katalogu głównego repo

Wszystkie komendy uruchamiaj w **głównym katalogu** `tealium-prism-react-native` (nie w `example/`).

### 1. Zainstaluj zależności

```bash
yarn
```

### 2. Zbuduj bibliotekę

```bash
yarn prepare
```

(lub `yarn bob build` – tworzy katalog `lib/` z modułem).

### 3. Uruchom Metro (w jednym terminalu)

```bash
yarn example start
```

Zostaw ten terminal otwarty.

### 4a. Android (w drugim terminalu)

```bash
yarn example android
```

Albo z głównego katalogu:

```bash
cd example && yarn android
```

**Uwaga:** Pierwszy build Androida może trwać kilka minut (Gradle, pobranie Prism SDK z Maven).

### 4b. iOS (w drugim terminalu)

Najpierw zainstaluj pody w przykładzie:

```bash
cd example/ios && pod install && cd ../..
```

Potem uruchom aplikację:

```bash
yarn example ios
```

Albo:

```bash
cd example && yarn ios
```

## Szybkie testowanie (Android)

Z głównego katalogu, w jednej sesji:

```bash
yarn && yarn prepare && yarn example start
```

W drugim terminalu:

```bash
cd /Users/sebastian/Projects/tealium-prism-react-native && yarn example android
```

## Co przetestować w aplikacji

1. **Status** – po starcie powinno być „Initialized” i widoczny Consent (np. unknown).
2. **Tracking** – TRACK VIEW, TRACK EVENT – sprawdź w logach (np. `adb logcat | grep -i tealium` na Androidzie).
3. **Data Layer** – ADD DATA (klucz + wartość), GET DATA – czy zwraca zapisaną wartość.
4. **Visitor** – GET VISITOR ID, RESET VISITOR ID – czy zwraca ID.
5. **Consent** – OPT IN / OPT OUT, GET CONSENT STATUS.
6. **Trace** – wpisz trace ID, JOIN TRACE – do debugowania w Tealium Event Stream.

## Logi (Android)

```bash
adb logcat | grep -E "TealiumPrismRN|Tealium"
```

## Częste problemy

- **Metro nie widzi modułu** – upewnij się, że wykonałeś `yarn prepare` w głównym katalogu.
- **Android build fail** – sprawdź, że w `example/android` jest `settings.gradle` i że link do biblioteki z `react-native.config.js` jest poprawny.
- **iOS: pod install** – zawsze z katalogu `example/ios`.
