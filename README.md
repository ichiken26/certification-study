# Certification Study

Nuxt 4 + Nuxt UI 4。スマホ向けオリジナル資格学習問題集。サーバー不要、学習履歴は端末内 localStorage に保存。初回オンラインで読み込んだ後、PWAでオフライン演習可能。

```sh
npm install
npm test
npm run dev
npm run build
```

Cloudflare Pages: build command `npm run build`、output directory `dist`（または `.output/public`）。Node 22推奨。

問題集は作成途中であり、公式問題や合格保証ではない。LinuCはVersion 10.0を対象とする。2027年1月ごろVersion 11.0予定。IPAの現行試験制度も2027年度に変更予定。

## 問題の追加
app/data/<資格ID>.txt に UTF-8 で記述。章と話題は `# 章 / 話題`。各行は `正答|設問|解説`。同一話題を優先して選択肢を生成する。明示的な誤答と解説を3組付ける場合は `正答|設問|解説|誤答1|解説1|誤答2|解説2|誤答3|解説3`。各章は4つ以上の異なる選択肢を用意すること。設問や回答の変更前に履歴IDの互換性を考慮すること。

`app/utils/catalog.ts` で資格を追加できる。問題のない資格は準備中と表示する。

## 公式出題範囲
- [AWS SAA-C03](https://docs.aws.amazon.com/ja_jp/aws-certification/latest/solutions-architect-associate-03/solutions-architect-associate-03.html)
- [LinuC 1](https://linuc.org/linuc1/range/)
- [LinuC 2026年ベータ](https://linuc.org/linuc/beta-exam-202609.html)
- [IPA 試験制度見直し](https://www.ipa.go.jp/shiken/minaoshi/index.html)
