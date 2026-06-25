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
    icon: MailCheck,
    label: "提出依頼・受付",
    description: "社外の相手にもメールリンクで依頼し、提出内容を受け付け",
  },
  {
    icon: Route,
    label: "確認・差し戻し",
    description: "不備がある項目を指定し、理由と修正依頼を残す",
  },
  {
    icon: History,
    label: "修正・再提出",
    description: "修正内容と申請者メッセージを履歴として追跡",
  },
  {
    icon: FileCheck2,
    label: "再確認・完了",
    description: "変更箇所を見ながら、最終判断まで同じ画面で進行",
  },
];

const featureBlocks = [
  {
    icon: Route,
    title: "差し戻し前提の進行管理",
    description:
      "最初の提出だけで完了しない業務でも、戻す項目、修正内容、再確認を一つの申請に集約します。",
  },
  {
    icon: ClipboardCheck,
    title: "指摘を入力項目に紐づける",
    description:
      "全体コメントだけでなく、修正してほしい項目ごとに理由を伝えられます。申請者は直す場所を迷いません。",
  },
  {
    icon: ShieldCheck,
    title: "最後まで履歴が残る",
    description:
      "提出、差し戻し、修正、再提出、承認の操作履歴を残し、後から誰がいつ何を判断したか確認できます。",
  },
];

const useCases = [
  {
    icon: Building2,
    title: "補助金・助成金の確認業務",
    description:
      "事業者や住民から届く書類を受け付け、金額、対象期間、添付資料などの不足を項目ごとに差し戻せます。",
    note: "再提出が何度か発生しても、同じ履歴で追跡できます。",
  },
  {
    icon: UsersRound,
    title: "取引先登録・契約前確認",
    description:
      "登録情報、確認書類、社内チェックなど、相手先と確認者の往復が発生する業務を進められます。",
    note: "社外メンバーにアカウント作成を求めず、メールリンクから修正してもらえます。",
  },
  {
    icon: MailCheck,
    title: "施設利用・許可手続き",
    description:
      "利用日、利用目的、連絡先、添付資料など、受付後の確認が多い手続きをフォーム化できます。",
    note: "差し戻し対象だけを明示し、必要な修正を最短で依頼できます。",
  },
  {
    icon: FileSpreadsheet,
    title: "承認後の集計・問い合わせ対応",
    description:
      "完了した申請を CSV で出力し、問い合わせ時には差し戻しや再提出の経緯まで確認できます。",
    note: "集計と監査対応を、同じ申請データから進められます。",
  },
];

const processSteps = [
  {
    icon: MailCheck,
    title: "提出を受け付ける",
    description:
      "公開フォームやメールリンクで必要な情報を集め、担当者が確認できる状態にします。",
  },
  {
    icon: Route,
    title: "不備を差し戻す",
    description:
      "修正が必要な項目を選び、項目別コメントと全体コメントを添えて戻します。",
  },
  {
    icon: History,
    title: "修正内容を確認する",
    description:
      "申請者の修正、再提出メッセージ、変更箇所を見ながら再確認します。",
  },
  {
    icon: FileCheck2,
    title: "受領できる状態にする",
    description:
      "残っている確認点をなくし、承認・却下・完了判断まで同じ申請で扱います。",
  },
];

/**
 * 未ログインユーザー向けのマーケティングトップを表示します。
 */
export function MarketingHome() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <section className="relative isolate min-h-[76svh] overflow-hidden">
        <Image
          src="/marketing/reviewflow-hero.png"
          alt="ReviewFlow の確認業務ワークフローを表す管理画面"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-white/72" aria-hidden="true" />

        <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" className="text-lg font-semibold text-slate-950">
            ReviewFlow
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-700 md:flex">
            <a href="#use-cases" className="hover:text-slate-950">
              利用シーン
            </a>
            <a href="#process" className="hover:text-slate-950">
              進め方
            </a>
            <a href="#features" className="hover:text-slate-950">
              特長
            </a>
            <a href="#workflow" className="hover:text-slate-950">
              流れ
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

        <div className="relative z-10 mx-auto flex w-full max-w-6xl px-5 pb-12 pt-12 sm:px-8 lg:pb-16 lg:pt-20">
          <div className="max-w-3xl">
            <p className="mb-5 inline-flex items-center rounded-lg border border-teal-200 bg-white/78 px-3 py-1 text-sm font-medium text-teal-900">
              差し戻しが前提の確認業務を、最後まで進める
            </p>
            <h1 className="text-5xl font-semibold leading-[1.05] text-slate-950 sm:text-6xl lg:text-7xl">
              ReviewFlow
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700 sm:text-xl">
              ReviewFlow は、提出を受け付けるだけでなく、確認、項目別の差し戻し、申請者の修正、再提出後の再確認、最終判断までを同じ流れで進める業務ワークフローです。
              手戻りが多く、完了まで人の確認が必要な業務を見失わずに進められます。
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
              <item.icon
                aria-hidden="true"
                className="mt-1 size-5 text-teal-700"
              />
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
          <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold text-teal-800">Use Cases</p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">
                申請後の確認と手戻りに時間がかかる業務へ
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-600">
                一度提出して終わりではなく、担当者が確認し、必要な箇所を戻し、相手が修正し、もう一度確認して完了する業務で使えます。
                外部の申請者や取引先は、アカウント登録なしでメールリンクから提出・修正できます。
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {useCases.map((item) => (
                <section
                  key={item.title}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-5"
                >
                  <item.icon
                    aria-hidden="true"
                    className="size-6 text-teal-700"
                  />
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

      <section id="process" className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold text-teal-800">
                Work Process
              </p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">
                差し戻してから完了するまでを、同じ申請で追う
              </h2>
              <div className="mt-8 space-y-4">
                {processSteps.map((step) => (
                  <section
                    key={step.title}
                    className="flex gap-4 rounded-lg border border-slate-200 bg-white p-5"
                  >
                    <step.icon
                      aria-hidden="true"
                      className="mt-1 size-6 shrink-0 text-teal-700"
                    />
                    <div>
                      <h3 className="text-base font-semibold text-slate-950">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        {step.description}
                      </p>
                    </div>
                  </section>
                ))}
              </div>
            </div>

            <figure className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <Image
                src="/marketing/reviewflow-hero.png"
                alt="ReviewFlow の差し戻しと再提出を確認する管理画面"
                width={1200}
                height={760}
                priority={false}
                sizes="(min-width: 1024px) 540px, 100vw"
                className="aspect-[30/19] w-full object-cover"
              />
              <figcaption className="border-t border-slate-200 p-5">
                <h3 className="text-base font-semibold leading-7 text-slate-950">
                  途中で止まりやすい確認業務を、状態と履歴で追跡
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  担当者は差し戻し対象、再提出後の変更、承認状況を同じ申請詳細から確認できます。
                </p>
              </figcaption>
            </figure>
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
              手戻りが多い業務ほど、どこで止まっているかが重要です
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              ReviewFlow は、提出物を受け取るフォームだけではありません。
              差し戻し後の修正、再提出、再確認までを業務の一部として扱います。
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {featureBlocks.map((item) => (
              <section
                key={item.title}
                className="rounded-lg border border-slate-200 bg-slate-50 p-5"
              >
                <item.icon
                  aria-hidden="true"
                  className="size-6 text-teal-700"
                />
                <h3 className="mt-5 text-lg font-semibold text-slate-950">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {item.description}
                </p>
              </section>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-950 text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-14 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">
              受付で終わらない業務を、完了まで進める。
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              項目ごとの指摘から再提出、承認判断、監査ログまで、同じ場所で運用できます。
            </p>
          </div>
          <Link
            href="/signup"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-white px-5 text-base font-medium text-slate-950 shadow-sm transition-colors hover:bg-slate-100"
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
                <a
                  href="#use-cases"
                  className="text-slate-600 hover:text-slate-950"
                >
                  利用シーン
                </a>
                <a
                  href="#process"
                  className="text-slate-600 hover:text-slate-950"
                >
                  進め方
                </a>
                <a
                  href="#features"
                  className="text-slate-600 hover:text-slate-950"
                >
                  特長
                </a>
                <a
                  href="#workflow"
                  className="text-slate-600 hover:text-slate-950"
                >
                  流れ
                </a>
              </div>
            </nav>

            <nav aria-label="フッター内アカウントリンク">
              <h2 className="text-xs font-semibold uppercase text-slate-500">
                Account
              </h2>
              <div className="mt-3 flex flex-col gap-2">
                <Link
                  href="/signup"
                  className="text-slate-600 hover:text-slate-950"
                >
                  新規登録
                </Link>
                <Link
                  href="/login"
                  className="text-slate-600 hover:text-slate-950"
                >
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
