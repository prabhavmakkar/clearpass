import { NextResponse } from 'next/server'
import { Bot, InlineKeyboard, webhookCallback } from 'grammy'
import { nanoid } from 'nanoid'
import {
  getUserByTelegramId,
  createTelegramLinkCode,
  getSubjects,
  getSections,
  getChapters,
  getQuestionsForChapters,
  getQuestionsByIds,
  getAttemptsByUser,
  getFreeChapterIds,
  getUserPurchasedChapterIds,
} from '@/lib/queries'
import type { Question } from '@/lib/types'

export const dynamic = 'force-dynamic'

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const
const APP_URL = process.env.AUTH_URL ?? 'https://clearpass.snpventures.in'

let _bot: Bot | null = null

function getBot(): Bot {
  if (!_bot) {
    _bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!)
    setupHandlers(_bot)
  }
  return _bot
}

function escapeMarkdown(text: string): string {
  return text.replace(/([*_`\[\]])/g, '\\$1')
}

async function sendQuestion(bot: Bot, chatId: number, questions: Question[], index: number, correct: number, total: number) {
  if (index >= questions.length) {
    await bot.api.sendMessage(chatId,
      `🏁 *Practice Complete!*\n\nScore: ${correct}/${total} (${total > 0 ? Math.round(correct / total * 100) : 0}%)\n\nSend /practice to try another chapter.`,
      { parse_mode: 'Markdown' }
    )
    return
  }

  const q = questions[index]
  const text =
    `*Q${total + 1}.* ${escapeMarkdown(q.stem)}\n\n` +
    q.options.map((opt, i) => `*${OPTION_LABELS[i]}.* ${escapeMarkdown(opt)}`).join('\n')

  const kb = new InlineKeyboard()
  for (let i = 0; i < 4; i++) {
    kb.text(OPTION_LABELS[i], `ans:${q.id}:${i}:${q.correctIndex}:${index}:${correct}:${total}`)
  }

  await bot.api.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: kb })
}

function setupHandlers(bot: Bot) {

  // ── /start — account linking ───────────────────────────────────────

  bot.command('start', async (ctx) => {
    const commandGuide =
      '📋 *Here\'s what you can do:*\n\n' +
      '/practice — Pick a subject, section & chapter to practice MCQs\n' +
      '/stats — View your test history & scores\n' +
      '/stop — End current practice session\n' +
      '/help — Show all commands'

    const user = await getUserByTelegramId(ctx.from!.id)
    if (user) {
      await ctx.reply(
        `👋 *Welcome back, ${escapeMarkdown(user.name)}!*\n\n` +
        commandGuide +
        '\n\nReady to practice? Send /practice to begin.',
        { parse_mode: 'Markdown' }
      )
      return
    }

    await ctx.reply(
      '👋 *Welcome to ClearPass Practice Bot!*\n\n' +
      'ClearPass helps CA students find their weak spots and improve through targeted practice.\n\n' +
      commandGuide +
      '\n\n🔗 *First, link your ClearPass account* to get started.\nTap the button below to sign in and connect.',
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard().url(
          '🔗 Link Account',
          `${APP_URL}/sign-in?callbackUrl=${encodeURIComponent(`/api/telegram/link?tgId=${ctx.from!.id}`)}`
        ),
      }
    )
  })

  // ── /help ──────────────────────────────────────────────────────────

  bot.command('help', async (ctx) => {
    await ctx.reply(
      '📚 *ClearPass Bot Commands*\n\n' +
      '/practice — Start practicing MCQs\n' +
      '/stop — End current practice session\n' +
      '/stats — View your practice stats\n' +
      '/help — Show this message',
      { parse_mode: 'Markdown' }
    )
  })

  // ── /practice — subject selection ──────────────────────────────────

  bot.command('practice', async (ctx) => {
    const user = await getUserByTelegramId(ctx.from!.id)
    if (!user) {
      await ctx.reply('Please link your account first. Send /start to get the link.')
      return
    }

    const subjects = await getSubjects()
    if (subjects.length === 0) {
      await ctx.reply('No subjects available yet. Check back soon!')
      return
    }

    const kb = new InlineKeyboard()
    for (const s of subjects) {
      kb.text(s.name, `sub:${s.id}`).row()
    }

    await ctx.reply('📖 Choose a subject:', { reply_markup: kb })
  })

  // ── Callback: subject → sections ───────────────────────────────────

  bot.callbackQuery(/^sub:(.+)$/, async (ctx) => {
    const subjectId = ctx.match![1]
    const sections = await getSections(subjectId)

    if (sections.length === 0) {
      await ctx.answerCallbackQuery()
      await ctx.editMessageText(
        '📚 *Stay Tuned!*\n\nSections for this subject are coming soon.\nSend /practice to try another subject.',
        { parse_mode: 'Markdown' }
      )
      return
    }

    const kb = new InlineKeyboard()
    for (const s of sections) {
      kb.text(s.name, `sec:${s.id}`).row()
    }
    kb.text('← Back', 'back:subjects').row()

    await ctx.editMessageText('📂 Choose a section:', { reply_markup: kb })
    await ctx.answerCallbackQuery()
  })

  // ── Callback: back to subjects ─────────────────────────────────────

  bot.callbackQuery('back:subjects', async (ctx) => {
    const subjects = await getSubjects()
    const kb = new InlineKeyboard()
    for (const s of subjects) {
      kb.text(s.name, `sub:${s.id}`).row()
    }
    await ctx.editMessageText('📖 Choose a subject:', { reply_markup: kb })
    await ctx.answerCallbackQuery()
  })

  // ── Callback: section → chapters ───────────────────────────────────

  bot.callbackQuery(/^sec:(.+)$/, async (ctx) => {
    const sectionId = ctx.match![1]
    const chapters = await getChapters([sectionId])

    if (chapters.length === 0) {
      await ctx.answerCallbackQuery()
      await ctx.editMessageText(
        '📚 *Stay Tuned!*\n\nChapters for this section are coming soon.\nSend /practice to try another section.',
        { parse_mode: 'Markdown' }
      )
      return
    }

    const kb = new InlineKeyboard()
    for (const c of chapters) {
      kb.text(c.name, `ch:${c.id}`).row()
    }
    kb.text('← Back', `back:sec:${chapters[0]?.subjectId ?? ''}`).row()

    await ctx.editMessageText('📝 Choose a chapter:', { reply_markup: kb })
    await ctx.answerCallbackQuery()
  })

  // ── Callback: back to sections ─────────────────────────────────────

  bot.callbackQuery(/^back:sec:(.+)$/, async (ctx) => {
    const subjectId = ctx.match![1]
    const sections = await getSections(subjectId)
    const kb = new InlineKeyboard()
    for (const s of sections) {
      kb.text(s.name, `sec:${s.id}`).row()
    }
    kb.text('← Back', 'back:subjects').row()
    await ctx.editMessageText('📂 Choose a section:', { reply_markup: kb })
    await ctx.answerCallbackQuery()
  })

  // ── Callback: chapter selected → first question ────────────────────

  bot.callbackQuery(/^ch:(.+)$/, async (ctx) => {
    const chapterId = ctx.match![1]

    const user = await getUserByTelegramId(ctx.from!.id)
    if (!user) {
      await ctx.answerCallbackQuery({ text: 'Please link your account first. Send /start' })
      return
    }

    const freeIds = await getFreeChapterIds()
    if (!freeIds.includes(chapterId)) {
      const purchased = await getUserPurchasedChapterIds(user.id)
      if (!purchased.includes(chapterId)) {
        await ctx.answerCallbackQuery()
        await ctx.editMessageText(
          '🔒 *This chapter requires purchase*\n\n' +
          'Unlock this chapter for ~₹999~ ₹299 (use code STUDY70)\n' +
          'Visit clearpass.snpventures.in/select to unlock.',
          { parse_mode: 'Markdown' }
        )
        return
      }
    }

    const questions = await getQuestionsForChapters([chapterId])

    if (questions.length === 0) {
      await ctx.answerCallbackQuery()
      await ctx.editMessageText(
        '📚 *Stay Tuned!*\n\n' +
        'Questions for this chapter are coming soon.\n' +
        'Try another chapter or send /practice to pick a different subject.',
        { parse_mode: 'Markdown' }
      )
      return
    }

    await ctx.answerCallbackQuery()
    await ctx.editMessageText(`Starting practice — ${questions.length} questions available.\nSend /stop anytime to end.`)
    await sendQuestion(bot, ctx.chat!.id, questions, 0, 0, 0)
  })

  // ── Callback: answer selected ──────────────────────────────────────

  bot.callbackQuery(/^ans:(.+):(\d):(\d):(\d+):(\d+):(\d+)$/, async (ctx) => {
    const [, questionId, pickedStr, correctStr, indexStr, correctCountStr, totalStr] = ctx.match!
    const picked = Number(pickedStr)
    const correctIdx = Number(correctStr)
    const index = Number(indexStr)
    let correctCount = Number(correctCountStr)
    const total = Number(totalStr) + 1
    const isCorrect = picked === correctIdx

    if (isCorrect) correctCount++

    const result = isCorrect
      ? `✅ *Correct!* (${OPTION_LABELS[correctIdx]})`
      : `❌ *Wrong.* You picked ${OPTION_LABELS[picked]}, correct was *${OPTION_LABELS[correctIdx]}*`

    await ctx.answerCallbackQuery({ text: isCorrect ? '✅ Correct!' : `❌ Correct: ${OPTION_LABELS[correctIdx]}` })
    await ctx.editMessageReplyMarkup({ reply_markup: undefined })

    const [fullQ] = await getQuestionsByIds([questionId])
    const explanation = fullQ?.explanation ? `\n\n💡 ${escapeMarkdown(fullQ.explanation)}` : ''

    await bot.api.sendMessage(ctx.chat!.id,
      `${result}${explanation}\n\n📊 Score: ${correctCount}/${total}`,
      { parse_mode: 'Markdown' }
    )

    if (fullQ) {
      const questions = await getQuestionsForChapters([fullQ.chapterId])
      if (index + 1 < questions.length) {
        await sendQuestion(bot, ctx.chat!.id, questions, index + 1, correctCount, total)
      } else {
        await bot.api.sendMessage(ctx.chat!.id,
          `🏁 *Practice Complete!*\n\nFinal Score: ${correctCount}/${total} (${Math.round(correctCount / total * 100)}%)\n\nSend /practice to try another chapter.`,
          { parse_mode: 'Markdown' }
        )
      }
    }
  })

  // ── /stop ──────────────────────────────────────────────────────────

  bot.command('stop', async (ctx) => {
    await ctx.reply('Practice stopped. Send /practice to start again.')
  })

  // ── /stats ─────────────────────────────────────────────────────────

  bot.command('stats', async (ctx) => {
    const user = await getUserByTelegramId(ctx.from!.id)
    if (!user) {
      await ctx.reply('Please link your account first. Send /start')
      return
    }

    const attempts = await getAttemptsByUser(user.id)

    if (attempts.length === 0) {
      await ctx.reply('No assessment history yet. Take a test on clearpass.snpventures.in to see stats here!')
      return
    }

    const best = Math.max(...attempts.map(a => a.overallScore))
    const totalQ = attempts.reduce((s, a) => s + a.totalCount, 0)

    await ctx.reply(
      `📊 *Your Stats*\n\n` +
      `Tests taken: ${attempts.length}\n` +
      `Best score: ${Math.round(best)}%\n` +
      `Total questions: ${totalQ}\n\n` +
      `View full history at clearpass.snpventures.in/history`,
      { parse_mode: 'Markdown' }
    )
  })
}

// ── Webhook handler ──────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const bot = getBot()
    const handler = webhookCallback(bot, 'std/http')
    return await handler(req)
  } catch (err) {
    console.error('[telegram/webhook] Error:', err)
    return NextResponse.json({ ok: true })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Telegram webhook active' })
}
