import {
  ArrowRight,
  Building2,
  ClipboardCheck,
  FileCheck2,
  FileSpreadsheet,
  History,
  LockKeyhole,
  MailCheck,
  Route,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const workflowHighlights = [
  {
    icon: ClipboardCheck,
    label: "申請受付",
    description: "メールアドレス宛の案内リンクから申請を受け付け",
  },
  {
    icon: Route,
    label: "項目別コメント",
    description: "確認すべき入力欄へ具体的なコメントを残す",
  },
  {
    icon: History,
    label: "再提出の追跡",
    description: "修正、再提出、再確認を同じ履歴で追える",
  },
  {
    icon: FileCheck2,
    label: "受領判断",
    description: "受け取れる状態かを進捗と変更内容から判断",
  },
];

const featureBlocks = [
  {
    icon: ClipboardCheck,
    title: "直す場所を明確に伝える",
    description:
      "申請全体に大きなメモを残すだけでなく、修正が必要な項目ごとに理由を添えられます。申請者は何を直せばよいか迷いません。",
  },
  {
    icon: UsersRound,
    title: "再提出までの流れを切らさない",
    description:
      "確認、修正依頼、再提出、再確認を同じ申請の履歴として扱い、担当者が次に見るべき状態を追いやすくします。",
  },
  {
    icon: ShieldCheck,
    title: "受け取れる状態を見極める",
    description:
      "承認前に残っている確認点や変更内容を整理し、最終的に受領できる申請かどうかを判断しやすくします。",
  },
];

const useCases = [
  {
    icon: Building2,
    title: "補助金・助成金の申請受付",
    description:
      "事業者や住民から届く申請を公開フォームで受け付け、金額、対象期間、連絡先などの確認点を項目ごとに整理できます。",
    note: "再提出が多い制度でも、修正依頼から再確認まで同じ履歴で追えます。",
  },
  {
    icon: MailCheck,
    title: "施設利用・許可申請の確認",
    description:
      "利用日、利用目的、申請者情報など、受付後の確認が発生しやすい手続きをメールリンクから案内できます。",
    note: "外部の申請者にログインやアカウント登録を求めず、必要な修正だけ進められます。",
  },
  {
    icon: UsersRound,
    title: "取引先・社外メンバーからの提出依頼",
    description:
      "登録情報、各種届出、確認書類など、組織外の相手から集める情報を承認担当者の確認フローに載せられます。",
    note: "部署や業務ごとにスペースを分け、誰が確認中かを見える状態にできます。",
  },
  {
    icon: FileSpreadsheet,
    title: "承認後の集計・問い合わせ対応",
    description:
      "承認済みの申請を CSV で出力し、後から問い合わせがあったときは差し戻し、再提出、承認の履歴を確認できます。",
    note: "集計や内部確認まで同じ申請データを起点に追跡できます。",
  },
];

const productScreens = [
  {
    src: "/marketing/screen-form-setup.gif",
    title: "申請フォームと承認フローをまとめて準備",
    description:
      "業務に必要な入力項目と確認ステップを、スペースごとに作成できます。",
    alt: "ReviewFlow の申請フォーム作成画面",
  },
  {
    src: "/marketing/screen-public-access.gif",
    title: "メールで届いたリンクから申請へ進む",
    description:
      "申請者は専用アカウントを作らず、案内されたメールアドレスで申請画面へ進めます。",
    alt: "ReviewFlow の公開申請アクセス画面",
  },
  {
    src: "/marketing/screen-public-form.gif",
    title: "申請者が必要な項目を入力して提出",
    description:
      "受付側が設定した項目に沿って入力し、提出後の確認や修正依頼につなげられます。",
    alt: "ReviewFlow の公開申請フォーム入力画面",
  },
];

/**
 * 未ログインユーザー向けのマーケティングトップを表示します。
 */
export function MarketingHome() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <section className="relative isolate min-h-[78svh] overflow-hidden">
        <Image
          src="/marketing/reviewflow-hero.png"
          alt="ReviewFlow の申請承認ワークフローを表すダッシュボード"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-white/70" aria-hidden="true" />

        <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" className="text-lg font-semibold text-slate-950">
            ReviewFlow
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-700 md:flex">
            <a href="#use-cases" className="hover:text-slate-950">
              利用シーン
            </a>
            <a href="#screens" className="hover:text-slate-950">
              画面
            </a>
            <a href="#features" className="hover:text-slate-950">
              特長
            </a>
            <a href="#workflow" className="hover:text-slate-950">
              業務フロー
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-white/70 hover:text-slate-950"
            >
              <LockKeyhole aria-hidden="true" className="size-4" />
              ログイン
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800"
            >
              無料で始める
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </header>

        <div className="relative z-10 mx-auto flex w-full max-w-6xl px-5 pb-14 pt-14 sm:px-8 lg:pb-20 lg:pt-20">
          <div className="max-w-2xl">
            <p className="mb-5 inline-flex items-center rounded-lg border border-teal-200 bg-white/75 px-3 py-1 text-sm font-medium text-teal-900">
              修正が必要な申請を、迷わず受け取れる状態へ
            </p>
            <h1 className="text-5xl font-semibold leading-[1.05] text-slate-950 sm:text-6xl lg:text-7xl">
              ReviewFlow
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-700 sm:text-xl">
              ReviewFlow は、確認時に気づいた不備を入力項目ごとに伝え、申請者の修正から再提出、最終確認までを同じ流れで進められる申請承認ワークフローです。
              外部の申請者は、メールアドレス宛に届く案内リンクから申請できます。
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 text-base font-medium text-white shadow-sm transition-colors hover:bg-slate-800"
              >
                アカウントを作成
                <ArrowRight aria-hidden="true" className="size-5" />
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white/80 px-5 text-base font-medium text-slate-950 transition-colors hover:bg-white"
              >
                既存アカウントでログイン
                <LockKeyhole aria-hidden="true" className="size-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="workflow" className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-6xl gap-3 px-5 py-5 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
          {workflowHighlights.map((item) => (
            <div
              key={item.label}
              className="flex min-h-28 gap-3 rounded-lg border border-slate-200 bg-white p-4"
            >
              <item.icon aria-hidden="true" className="mt-1 size-5 text-teal-700" />
              <div>
                <h2 className="text-sm font-semibold text-slate-950">
                  {item.label}
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="use-cases" className="bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold text-teal-800">Use Cases</p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">
                具体的な利用シーン
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-600">
                補助金申請、施設利用申請、各種届出など、受付後に確認や修正依頼が発生する手続きで使えます。
                申請者はログインやアカウント登録をしなくても、メールアドレス宛のリンクから申請できます。
                承認者と管理者は同じ申請の状態を見ながら進められます。
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {useCases.map((item) => (
                <section
                  key={item.title}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-5"
                >
                  <item.icon aria-hidden="true" className="size-6 text-teal-700" />
                  <h3 className="mt-5 text-lg font-semibold leading-7 text-slate-950">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {item.description}
                  </p>
                  <p className="mt-4 border-l-2 border-teal-600 pl-3 text-sm leading-6 text-slate-700">
                    {item.note}
                  </p>
                </section>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="screens" className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-teal-800">
              Product Screens
            </p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">
              実際の画面
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              フォーム作成からメールリンクでの申請、入力まで、実際の操作画面で流れを確認できます。
            </p>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {productScreens.map((screen) => (
              <figure
                key={screen.title}
                className="overflow-hidden rounded-lg border border-slate-200 bg-white"
              >
                <Image
                  src={screen.src}
                  alt={screen.alt}
                  width={600}
                  height={336}
                  unoptimized
                  className="aspect-[25/14] w-full border-b border-slate-200 object-cover"
                />
                <figcaption className="p-5">
                  <h3 className="text-base font-semibold leading-7 text-slate-950">
                    {screen.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {screen.description}
                  </p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-teal-800">
              Correction Workflow
            </p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">
              直す場所が伝われば、申請はもっと早く前に進む。
            </h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {featureBlocks.map((item) => (
              <section
                key={item.title}
                className="rounded-lg border border-slate-200 bg-slate-50 p-5"
              >
                <item.icon aria-hidden="true" className="size-6 text-teal-700" />
                <h3 className="mt-5 text-lg font-semibold text-slate-950">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {item.description}
                </p>
              </section>
            ))}
          </div>
          <p className="mt-8 max-w-3xl text-sm leading-7 text-slate-500">
            申請、差し戻し、再提出、承認の操作履歴も残るため、監査対応が必要な場面でも誰がいつ何をしたかをあとから確認できます。
          </p>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-14 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">
              申請を、受け取れる状態まで導く。
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              項目ごとの指摘から再提出、承認判断まで、同じ場所で運用できます。
            </p>
          </div>
          <Link
            href="/signup"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 text-base font-medium text-white shadow-sm transition-colors hover:bg-slate-800"
          >
            ReviewFlow を始める
            <ArrowRight aria-hidden="true" className="size-5" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-10 sm:px-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-md">
            <Link href="/" className="text-lg font-semibold text-slate-950">
              ReviewFlow
            </Link>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              項目ごとの修正依頼から再提出、承認判断、監査ログまでを一元管理する業務ワークフロー SaaS です。
            </p>
            <p className="mt-4 text-xs text-slate-500">
              © 2026 ReviewFlow. All rights reserved.
            </p>
          </div>

          <div className="grid gap-8 text-sm sm:grid-cols-2">
            <nav aria-label="フッター内ページリンク">
              <h2 className="text-xs font-semibold uppercase text-slate-500">
                Product
              </h2>
              <div className="mt-3 flex flex-col gap-2">
                <a href="#use-cases" className="text-slate-600 hover:text-slate-950">
                  利用シーン
                </a>
                <a href="#workflow" className="text-slate-600 hover:text-slate-950">
                  業務フロー
                </a>
                <a href="#screens" className="text-slate-600 hover:text-slate-950">
                  画面
                </a>
                <a href="#features" className="text-slate-600 hover:text-slate-950">
                  特長
                </a>
              </div>
            </nav>

            <nav aria-label="フッター内アカウントリンク">
              <h2 className="text-xs font-semibold uppercase text-slate-500">
                Account
              </h2>
              <div className="mt-3 flex flex-col gap-2">
                <Link href="/signup" className="text-slate-600 hover:text-slate-950">
                  新規登録
                </Link>
                <Link href="/login" className="text-slate-600 hover:text-slate-950">
                  ログイン
                </Link>
              </div>
            </nav>
          </div>
        </div>
      </footer>
    </main>
  );
}
