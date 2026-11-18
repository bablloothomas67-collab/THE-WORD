#!/usr/bin/env python3
"""One-off: writes content/devotionals/week-03.json (23–29 Nov 2026) from the text below.
Kept as plain paragraphs so the wording is easy to review and correct; delete after import."""
import json

def ref(book, chapter, start, end=None):
    return {"book": book, "chapter": chapter, "verse_start": start, "verse_end": end if end else start}

def paras(text):
    return "\n\n".join(p.strip() for p in text.strip().split("\n\n"))

WEEK = [
 dict(slug="ask-seek-knock", date="2026-11-23", theme="Persevering prayer", refs=[ref("MAT", 7, 7, 11)],
  en=dict(title="Ask, Seek, Knock", reflection="""
In the Sermon on the Mount Jesus gives three simple pictures of prayer: asking, seeking and knocking. Each one is a little more persistent than the last. Many readers have noticed that the words carry the sense of continuing: keep asking, keep seeking, keep knocking.

Jesus then points to something every parent understands. A child who asks for bread is not handed a stone. If flawed human parents know how to give good things, he says, the Father in heaven can be trusted far more.

This is not a promise that we will receive whatever we name. It is a promise about the one we are speaking to. He hears, he is good, and what he gives will be good, even when it is not what we expected or when we expected it.""",
   application="Choose one thing you have stopped praying about because nothing seemed to change. Bring it to God again today, plainly, as a child speaks to a parent. Then ask him also for the trust to receive his answer.",
   questions=["What have I stopped asking God for, and why?",
              "Do I think of God as a Father who wants to give good things, or as someone I must persuade?"],
   prayer="Father in heaven, you invite me to ask, to seek and to knock. Forgive me for the times I gave up quickly. Give me a persevering heart, and help me to trust that what you give is good. Amen."),
  ml=dict(title="ചോദിക്കുവിൻ, അന്വേഷിക്കുവിൻ, മുട്ടുവിൻ", reflection="""
ഗിരിപ്രഭാഷണത്തിൽ യേശു പ്രാർത്ഥനയെക്കുറിച്ച് മൂന്ന് ലളിതമായ ചിത്രങ്ങൾ നൽകുന്നു: ചോദിക്കുക, അന്വേഷിക്കുക, മുട്ടുക. ഓരോന്നും മുമ്പത്തേതിനെക്കാൾ അല്പംകൂടി സ്ഥിരോത്സാഹമുള്ളതാണ്. തുടർച്ചയുടെ അർത്ഥം ഈ വാക്കുകളിലുണ്ടെന്ന് പല വായനക്കാരും ശ്രദ്ധിച്ചിട്ടുണ്ട്: ചോദിച്ചുകൊണ്ടിരിക്കുക, അന്വേഷിച്ചുകൊണ്ടിരിക്കുക, മുട്ടിക്കൊണ്ടിരിക്കുക.

തുടർന്ന് എല്ലാ മാതാപിതാക്കൾക്കും മനസ്സിലാകുന്ന ഒരു കാര്യത്തിലേക്ക് യേശു വിരൽചൂണ്ടുന്നു. അപ്പം ചോദിക്കുന്ന കുഞ്ഞിന് ആരും കല്ല് കൊടുക്കാറില്ല. കുറവുകളുള്ള മനുഷ്യരായ മാതാപിതാക്കൾക്ക് മക്കൾക്ക് നല്ലത് കൊടുക്കാൻ അറിയാമെങ്കിൽ, സ്വർഗ്ഗസ്ഥനായ പിതാവിനെ അതിലും എത്രയോ അധികം വിശ്വസിക്കാം എന്ന് അവിടുന്ന് പറയുന്നു.

നാം പേരെടുത്തു ചോദിക്കുന്നതെല്ലാം കിട്ടും എന്ന വാഗ്‌ദാനമല്ല ഇത്. നാം ആരോടാണ് സംസാരിക്കുന്നത് എന്നതിനെക്കുറിച്ചുള്ള വാഗ്‌ദാനമാണ്. അവിടുന്ന് കേൾക്കുന്നു, അവിടുന്ന് നല്ലവനാണ്, അവിടുന്ന് നൽകുന്നത് നല്ലതായിരിക്കും; അത് നാം പ്രതീക്ഷിച്ചതോ പ്രതീക്ഷിച്ച സമയത്തോ അല്ലെങ്കിൽപ്പോലും.""",
   application="ഒന്നും മാറുന്നില്ല എന്നു തോന്നിയതുകൊണ്ട് നിങ്ങൾ പ്രാർത്ഥിക്കുന്നത് നിർത്തിയ ഒരു കാര്യം തിരഞ്ഞെടുക്കുക. ഒരു കുഞ്ഞ് അപ്പനോടോ അമ്മയോടോ സംസാരിക്കുന്നതുപോലെ, ഇന്ന് അത് വീണ്ടും ലളിതമായി ദൈവസന്നിധിയിൽ കൊണ്ടുവരിക. അവിടുത്തെ ഉത്തരം സ്വീകരിക്കാനുള്ള വിശ്വാസത്തിനായും ചോദിക്കുക.",
   questions=["ദൈവത്തോട് ചോദിക്കുന്നത് ഞാൻ നിർത്തിയ കാര്യം ഏതാണ്? എന്തുകൊണ്ട്?",
              "നല്ലത് നൽകാൻ ആഗ്രഹിക്കുന്ന പിതാവായാണോ, അതോ ഞാൻ പറഞ്ഞു സമ്മതിപ്പിക്കേണ്ട ഒരാളായാണോ ഞാൻ ദൈവത്തെ കാണുന്നത്?"],
   prayer="സ്വർഗ്ഗസ്ഥനായ പിതാവേ, ചോദിക്കാനും അന്വേഷിക്കാനും മുട്ടാനും അങ്ങ് എന്നെ ക്ഷണിക്കുന്നു. വേഗത്തിൽ മടുത്തുപോയ സമയങ്ങൾ എന്നോട് ക്ഷമിക്കണമേ. സ്ഥിരതയുള്ള ഒരു ഹൃദയം എനിക്ക് തരണമേ; അങ്ങ് നൽകുന്നത് നല്ലതാണെന്ന് വിശ്വസിക്കാൻ എന്നെ സഹായിക്കണമേ. ആമേൻ.")),

 dict(slug="quick-to-listen", date="2026-11-24", theme="Listening and speech", refs=[ref("JAS", 1, 19, 20)],
  en=dict(title="Quick to Listen", reflection="""
James writes like a wise elder who has watched many arguments. His advice is short enough to remember in the middle of one: be quick to listen, slow to speak and slow to become angry.

Most of us reverse the order. We speak quickly, grow angry quickly and listen last, if at all. James gives the reason for his counsel: human anger does not bring about the right living that God desires. Anger may feel like strength, but it rarely makes anything right.

Listening is a form of love. It tells the other person that they matter more than our reply. Scripture often shows God as one who hears the cry of his people, and those who belong to him are called to resemble him in this.""",
   application="In one conversation today, decide beforehand to listen fully before you answer. Do not prepare your reply while the other person is speaking. If you feel anger rising, pause and take one slow breath before you say anything.",
   questions=["Who in my life most needs me to listen to them?",
              "When did my anger last make a situation better?"],
   prayer="Lord, you hear me whenever I call. Make me quick to listen and slow to speak. Guard my tongue when I am angry, and teach me to love others by truly hearing them. Amen."),
  ml=dict(title="കേൾക്കാൻ വേഗത", reflection="""
അനേകം തർക്കങ്ങൾ കണ്ടിട്ടുള്ള ജ്ഞാനിയായ ഒരു മൂപ്പനെപ്പോലെയാണ് യാക്കോബ് എഴുതുന്നത്. ഒരു തർക്കത്തിനിടയിൽപ്പോലും ഓർക്കാൻ കഴിയുന്നത്ര ചെറുതാണ് അദ്ദേഹത്തിന്റെ ഉപദേശം: കേൾക്കാൻ വേഗതയും സംസാരിക്കാൻ താമസവും കോപിക്കാൻ താമസവും ഉള്ളവരായിരിക്കുക.

നമ്മിൽ മിക്കവരും ഈ ക്രമം തിരിച്ചാണ് പാലിക്കുന്നത്. നാം വേഗം സംസാരിക്കുന്നു, വേഗം കോപിക്കുന്നു; കേൾക്കുന്നത് ഒടുവിലാണ്, ചിലപ്പോൾ കേൾക്കാറേയില്ല. തന്റെ ഉപദേശത്തിനുള്ള കാരണവും യാക്കോബ് പറയുന്നു: ദൈവം ആഗ്രഹിക്കുന്ന നീതിയുള്ള ജീവിതം മനുഷ്യന്റെ കോപം ഉളവാക്കുന്നില്ല. കോപം ശക്തിയായി തോന്നിയേക്കാം; എന്നാൽ അത് അപൂർവമായേ എന്തിനെയെങ്കിലും ശരിയാക്കാറുള്ളൂ.

കേൾക്കുന്നത് സ്നേഹത്തിന്റെ ഒരു രൂപമാണ്. നമ്മുടെ മറുപടിയെക്കാൾ പ്രധാനം ആ വ്യക്തിയാണെന്ന് അത് അവരോട് പറയുന്നു. തന്റെ ജനത്തിന്റെ നിലവിളി കേൾക്കുന്നവനായി തിരുവെഴുത്ത് ദൈവത്തെ പലപ്പോഴും കാണിക്കുന്നു; അവിടുത്തേക്കുള്ളവർ ഇക്കാര്യത്തിൽ അവിടുത്തെപ്പോലെയാകാൻ വിളിക്കപ്പെട്ടിരിക്കുന്നു.""",
   application="ഇന്ന് ഒരു സംഭാഷണത്തിലെങ്കിലും, മറുപടി പറയുന്നതിനു മുമ്പ് മുഴുവനായി കേൾക്കുമെന്ന് മുൻകൂട്ടി തീരുമാനിക്കുക. മറ്റേയാൾ സംസാരിക്കുമ്പോൾ മനസ്സിൽ മറുപടി ഒരുക്കരുത്. കോപം ഉയരുന്നതായി തോന്നിയാൽ, എന്തെങ്കിലും പറയുന്നതിനു മുമ്പ് ഒന്നു നിർത്തി സാവധാനം ഒരു ശ്വാസമെടുക്കുക.",
   questions=["എന്റെ ജീവിതത്തിൽ ഞാൻ ശ്രദ്ധിച്ചു കേൾക്കേണ്ടത് ഏറ്റവും ആവശ്യമുള്ളത് ആർക്കാണ്?",
              "എന്റെ കോപം ഒരു സാഹചര്യത്തെ മെച്ചപ്പെടുത്തിയത് ഒടുവിൽ എപ്പോഴാണ്?"],
   prayer="കർത്താവേ, ഞാൻ വിളിക്കുമ്പോഴെല്ലാം അങ്ങ് എന്നെ കേൾക്കുന്നു. കേൾക്കാൻ വേഗതയും സംസാരിക്കാൻ താമസവും എനിക്ക് തരണമേ. ഞാൻ കോപിക്കുമ്പോൾ എന്റെ നാവിനെ കാക്കണമേ; മറ്റുള്ളവരെ ശരിക്കും കേട്ടുകൊണ്ട് അവരെ സ്നേഹിക്കാൻ എന്നെ പഠിപ്പിക്കണമേ. ആമേൻ.")),

 dict(slug="do-not-grow-weary", date="2026-11-25", theme="Perseverance in doing good", refs=[ref("GAL", 6, 9, 10)],
  en=dict(title="Do Not Grow Weary", reflection="""
Paul uses the language of a farmer. Whoever sows must wait, and for a long time the field shows nothing. He tells the Galatians not to lose heart in doing good, because the harvest comes at its proper time for those who do not give up.

Goodness is often tiring because it is so ordinary: caring for an aging parent, being honest when no one checks, forgiving again, turning up again. Such work is rarely noticed and seldom thanked. Paul does not deny the tiredness. He places it inside a promise.

He also widens the circle. We are to do good to everyone as we have opportunity, with particular care for the family of believers. Love begins at home, but it is not meant to stay there.""",
   application="Name one good thing you have grown tired of doing. Do it once more today, this time as something offered to God rather than to the person who may not notice. Then look for one small good you can do for someone outside your usual circle.",
   questions=["Where am I most tempted to give up doing good?",
              "Who outside my own circle could I do good to this week?"],
   prayer="Faithful God, you see what is done in secret. When I am tired of doing good, renew my strength and my love. Help me to keep sowing with patience, and to leave the harvest in your hands. Amen."),
  ml=dict(title="നന്മ ചെയ്യുന്നതിൽ മടുക്കരുത്", reflection="""
പൗലോസ് ഇവിടെ ഒരു കർഷകന്റെ ഭാഷയാണ് ഉപയോഗിക്കുന്നത്. വിതയ്ക്കുന്നവൻ കാത്തിരിക്കണം; ഏറെക്കാലം വയലിൽ ഒന്നും കാണാനുണ്ടാവില്ല. നന്മ ചെയ്യുന്നതിൽ മനസ്സു മടുക്കരുതെന്ന് അദ്ദേഹം ഗലാത്യരോട് പറയുന്നു; കാരണം, തളർന്നുപോകാത്തവർക്ക് തക്കസമയത്ത് കൊയ്ത്ത് വരും.

നന്മ പലപ്പോഴും മടുപ്പിക്കുന്നത് അത് അത്രമേൽ സാധാരണമായതുകൊണ്ടാണ്: പ്രായമായ മാതാപിതാക്കളെ പരിചരിക്കുക, ആരും പരിശോധിക്കാത്തപ്പോഴും സത്യസന്ധരായിരിക്കുക, വീണ്ടും ക്ഷമിക്കുക, വീണ്ടും ഒപ്പം നിൽക്കുക. ഇത്തരം കാര്യങ്ങൾ അപൂർവമായേ ശ്രദ്ധിക്കപ്പെടാറുള്ളൂ; നന്ദി കിട്ടുന്നതും ചുരുക്കം. പൗലോസ് ആ ക്ഷീണത്തെ നിഷേധിക്കുന്നില്ല. അതിനെ ഒരു വാഗ്‌ദാനത്തിനുള്ളിൽ വയ്ക്കുകയാണ് ചെയ്യുന്നത്.

അദ്ദേഹം വൃത്തം വലുതാക്കുകയും ചെയ്യുന്നു. അവസരം കിട്ടുന്നതനുസരിച്ച് എല്ലാവർക്കും നന്മ ചെയ്യണം; വിശ്വാസികളുടെ കുടുംബത്തോട് പ്രത്യേക കരുതലോടെ. സ്നേഹം വീട്ടിൽ തുടങ്ങുന്നു; എന്നാൽ അത് അവിടെ ഒതുങ്ങിനിൽക്കാനുള്ളതല്ല.""",
   application="ചെയ്തു മടുത്ത ഒരു നല്ല കാര്യം ഓർക്കുക. ഇന്ന് അത് ഒരിക്കൽക്കൂടി ചെയ്യുക; ഇത്തവണ, ശ്രദ്ധിക്കാനിടയില്ലാത്ത ആ വ്യക്തിക്കല്ല, ദൈവത്തിന് സമർപ്പിക്കുന്ന ഒന്നായി. തുടർന്ന്, നിങ്ങളുടെ പതിവു വൃത്തത്തിനു പുറത്തുള്ള ഒരാൾക്ക് ചെയ്യാവുന്ന ഒരു ചെറിയ നന്മ കണ്ടെത്തുക.",
   questions=["നന്മ ചെയ്യുന്നത് നിർത്താൻ ഞാൻ ഏറ്റവും പ്രലോഭിപ്പിക്കപ്പെടുന്നത് എവിടെയാണ്?",
              "എന്റെ സ്വന്തം വൃത്തത്തിനു പുറത്തുള്ള ആർക്കാണ് ഈ ആഴ്ച എനിക്ക് നന്മ ചെയ്യാൻ കഴിയുക?"],
   prayer="വിശ്വസ്തനായ ദൈവമേ, രഹസ്യത്തിൽ ചെയ്യുന്നത് അങ്ങ് കാണുന്നു. നന്മ ചെയ്തു ഞാൻ തളരുമ്പോൾ എന്റെ ശക്തിയും സ്നേഹവും പുതുക്കണമേ. ക്ഷമയോടെ വിതച്ചുകൊണ്ടിരിക്കാനും കൊയ്ത്ത് അങ്ങയുടെ കൈകളിൽ ഏല്പിക്കാനും എന്നെ സഹായിക്കണമേ. ആമേൻ.")),

 dict(slug="walk-humbly", date="2026-11-26", theme="Justice, mercy and humility", refs=[ref("MIC", 6, 8)],
  en=dict(title="Walk Humbly", reflection="""
In Micah's time people wondered what would please God. Would he want more sacrifices, larger offerings, something costly and impressive? The prophet's answer turns the question around. God has already shown what is good, and it is not a matter of quantity.

Three things are asked: to act justly, to love mercy and to walk humbly with God. Justice concerns how we treat others, especially those with less power than ourselves. Mercy goes beyond what is owed. Humility keeps both from turning into pride.

Notice the word walk. This is not a single act but a way of going through each day in God's company. Worship still matters, but worship that leaves our dealings with other people unchanged has missed its purpose.""",
   application="Look at one ordinary dealing today, such as paying someone, giving an opinion about someone or deciding whose needs come first. Ask what would be just there, and what would be merciful. Then do it without telling anyone.",
   questions=["Is there someone I am treating less than fairly?",
              "Where do I offer God impressive things in place of an obedient life?"],
   prayer="Lord, you have shown me what is good. Give me the courage to act justly, a heart that loves mercy, and the humility to walk beside you today. Amen."),
  ml=dict(title="താഴ്മയോടെ നടക്കുക", reflection="""
മീഖായുടെ കാലത്ത്, ദൈവത്തെ പ്രസാദിപ്പിക്കുന്നത് എന്താണെന്ന് ജനം ചിന്തിച്ചു. കൂടുതൽ യാഗങ്ങളോ, വലിയ വഴിപാടുകളോ, വിലയേറിയതും മതിപ്പുളവാക്കുന്നതുമായ എന്തെങ്കിലുമോ ആണോ അവിടുന്ന് ആഗ്രഹിക്കുന്നത്? പ്രവാചകന്റെ ഉത്തരം ആ ചോദ്യത്തെത്തന്നെ തിരിച്ചിടുന്നു. നല്ലത് എന്തെന്ന് ദൈവം നേരത്തേ കാണിച്ചുതന്നിട്ടുണ്ട്; അത് അളവിന്റെ കാര്യമല്ല.

മൂന്നു കാര്യങ്ങളാണ് ആവശ്യപ്പെടുന്നത്: ന്യായം പ്രവർത്തിക്കുക, ദയയെ സ്നേഹിക്കുക, ദൈവത്തോടൊപ്പം താഴ്മയോടെ നടക്കുക. നാം മറ്റുള്ളവരോട്, പ്രത്യേകിച്ച് നമ്മെക്കാൾ ബലം കുറഞ്ഞവരോട്, എങ്ങനെ പെരുമാറുന്നു എന്നതാണ് ന്യായം. കടപ്പെട്ടതിനും അപ്പുറം പോകുന്നതാണ് ദയ. ഇവ രണ്ടും അഹങ്കാരമായി മാറാതെ കാക്കുന്നത് താഴ്മയാണ്.

നടക്കുക എന്ന വാക്ക് ശ്രദ്ധിക്കുക. ഇത് ഒറ്റത്തവണ ചെയ്യുന്ന ഒരു പ്രവൃത്തിയല്ല; ഓരോ ദിവസവും ദൈവത്തോടൊപ്പം കടന്നുപോകുന്ന ഒരു ജീവിതരീതിയാണ്. ആരാധന ഇപ്പോഴും പ്രധാനമാണ്; എന്നാൽ മറ്റുള്ളവരോടുള്ള നമ്മുടെ ഇടപാടുകളെ മാറ്റാത്ത ആരാധന അതിന്റെ ലക്ഷ്യം നഷ്ടപ്പെടുത്തിയിരിക്കുന്നു.""",
   application="ഇന്നത്തെ ഒരു സാധാരണ ഇടപാട് ശ്രദ്ധിക്കുക: ഒരാൾക്ക് കൂലി കൊടുക്കുന്നതോ, ഒരാളെക്കുറിച്ച് അഭിപ്രായം പറയുന്നതോ, ആരുടെ ആവശ്യത്തിന് മുൻഗണന നൽകണമെന്ന് തീരുമാനിക്കുന്നതോ ആകാം. അവിടെ ന്യായമായത് എന്താണെന്നും ദയയുള്ളത് എന്താണെന്നും ചോദിക്കുക. എന്നിട്ട് ആരോടും പറയാതെ അത് ചെയ്യുക.",
   questions=["ഞാൻ ന്യായമായി പെരുമാറാത്ത ആരെങ്കിലുമുണ്ടോ?",
              "അനുസരണയുള്ള ജീവിതത്തിനു പകരം മതിപ്പുളവാക്കുന്ന കാര്യങ്ങൾ ഞാൻ ദൈവത്തിന് അർപ്പിക്കുന്നത് എവിടെയാണ്?"],
   prayer="കർത്താവേ, നല്ലത് എന്തെന്ന് അങ്ങ് എനിക്ക് കാണിച്ചുതന്നിരിക്കുന്നു. ന്യായം പ്രവർത്തിക്കാനുള്ള ധൈര്യവും ദയയെ സ്നേഹിക്കുന്ന ഹൃദയവും ഇന്ന് അങ്ങയോടൊപ്പം നടക്കാനുള്ള താഴ്മയും എനിക്ക് തരണമേ. ആമേൻ.")),

 dict(slug="learning-contentment", date="2026-11-27", theme="Contentment", refs=[ref("PHP", 4, 11, 13)],
  en=dict(title="Learning Contentment", reflection="""
Paul writes these words as a prisoner, thanking friends in Philippi for a gift. He tells them he has learned to be content in every condition, whether he has plenty or goes hungry. The word learned matters. Contentment did not come to him naturally. It was a lesson, taken slowly, in hard places.

The well-known line about being able to do all things through the one who strengthens him belongs here. Paul is not speaking of winning or of achieving whatever he wishes. He means that Christ gives him strength to stand firm in every circumstance, in abundance without pride and in need without despair.

Contentment is not giving up on a better life. It is freedom from the belief that peace begins only when circumstances change.""",
   application="Write down three things you already have that you once hoped for. Thank God for each one by name. Then name one thing you lack, and ask him for the strength to be at peace today, with or without it.",
   questions=["What do I believe I must have before I can be at peace?",
              "What has a difficult season taught me that an easy one could not?"],
   prayer="Lord Jesus, you are my strength in plenty and in need. Teach me the secret Paul learned. Free me from restless wanting, and let me find my peace in you today. Amen."),
  ml=dict(title="സംതൃപ്തി പഠിക്കുക", reflection="""
ഒരു തടവുകാരനായിരിക്കെയാണ് പൗലോസ് ഈ വാക്കുകൾ എഴുതുന്നത്; ഫിലിപ്പിയിലെ സ്നേഹിതർ അയച്ച സഹായത്തിന് നന്ദി പറഞ്ഞുകൊണ്ട്. സമൃദ്ധിയിലായാലും വിശപ്പിലായാലും, ഏത് അവസ്ഥയിലും സംതൃപ്തനായിരിക്കാൻ താൻ പഠിച്ചിരിക്കുന്നു എന്ന് അദ്ദേഹം പറയുന്നു. പഠിച്ചു എന്ന വാക്ക് പ്രധാനമാണ്. സംതൃപ്തി അദ്ദേഹത്തിന് സ്വാഭാവികമായി വന്നതല്ല. പ്രയാസമുള്ള ഇടങ്ങളിൽ, സാവധാനം പഠിച്ച ഒരു പാഠമായിരുന്നു അത്.

തന്നെ ശക്തനാക്കുന്നവൻ മുഖാന്തരം എല്ലാം ചെയ്യാൻ കഴിയും എന്ന പ്രസിദ്ധമായ വചനം ഈ സന്ദർഭത്തിലുള്ളതാണ്. ആഗ്രഹിക്കുന്നതെന്തും നേടുന്നതിനെക്കുറിച്ചോ വിജയിക്കുന്നതിനെക്കുറിച്ചോ അല്ല പൗലോസ് പറയുന്നത്. ഏത് സാഹചര്യത്തിലും ഉറച്ചുനിൽക്കാൻ ക്രിസ്തു തനിക്ക് ശക്തി നൽകുന്നു എന്നാണ്: സമൃദ്ധിയിൽ അഹങ്കാരമില്ലാതെ, ഇല്ലായ്മയിൽ നിരാശയില്ലാതെ.

സംതൃപ്തി എന്നാൽ മെച്ചപ്പെട്ട ജീവിതത്തിനുള്ള ശ്രമം ഉപേക്ഷിക്കലല്ല. സാഹചര്യങ്ങൾ മാറിയാലേ സമാധാനം തുടങ്ങൂ എന്ന വിശ്വാസത്തിൽനിന്നുള്ള സ്വാതന്ത്ര്യമാണ് അത്.""",
   application="ഒരിക്കൽ നിങ്ങൾ ആഗ്രഹിച്ചതും ഇപ്പോൾ നിങ്ങൾക്കുള്ളതുമായ മൂന്നു കാര്യങ്ങൾ എഴുതുക. ഓരോന്നിനും പേരെടുത്ത് ദൈവത്തിന് നന്ദി പറയുക. തുടർന്ന്, നിങ്ങൾക്ക് ഇല്ലാത്ത ഒരു കാര്യം പറയുക; അത് ഉണ്ടായാലും ഇല്ലെങ്കിലും ഇന്ന് സമാധാനത്തോടെയിരിക്കാനുള്ള ശക്തിക്കായി അവിടുത്തോട് ചോദിക്കുക.",
   questions=["സമാധാനം കിട്ടണമെങ്കിൽ എനിക്ക് ഉണ്ടായിരിക്കണമെന്ന് ഞാൻ വിശ്വസിക്കുന്നത് എന്താണ്?",
              "എളുപ്പമുള്ള കാലത്തിന് പഠിപ്പിക്കാൻ കഴിയാത്ത എന്താണ് പ്രയാസമുള്ള ഒരു കാലം എന്നെ പഠിപ്പിച്ചത്?"],
   prayer="കർത്താവായ യേശുവേ, സമൃദ്ധിയിലും ഇല്ലായ്മയിലും അങ്ങാണ് എന്റെ ശക്തി. പൗലോസ് പഠിച്ച ആ രഹസ്യം എന്നെയും പഠിപ്പിക്കണമേ. അടങ്ങാത്ത ആഗ്രഹങ്ങളിൽനിന്ന് എന്നെ വിടുവിക്കണമേ; ഇന്ന് അങ്ങയിൽ എന്റെ സമാധാനം കണ്ടെത്താൻ ഇടയാക്കണമേ. ആമേൻ.")),

 dict(slug="waiting-for-the-morning", date="2026-11-28", theme="Waiting and hope", refs=[ref("PSA", 130, 5, 6)],
  en=dict(title="Waiting for the Morning", reflection="""
Psalm 130 begins in the depths, with a cry for mercy. By its middle the cry has become waiting. The psalmist waits for the Lord with his whole being and sets his hope on God's word.

Then comes a picture repeated twice for emphasis: watchmen looking for the morning. A night guard on a city wall cannot make the sun rise sooner. But he does not doubt that it will rise. His waiting is tired, alert and certain all at once.

This psalm has been prayed for centuries at evening prayer and in times of grief, across many Christian traditions. It teaches that waiting on God is not idleness. It is hope held steady in the dark, resting on a promise rather than on what can yet be seen.""",
   application="Name one thing you are waiting for and cannot hurry. This evening, before you sleep, read Psalm 130 slowly and hand that one thing to God for the night. Let the morning be his to bring.",
   questions=["What am I waiting for at present, and how am I waiting?",
              "Which promise of God can I hold on to while the answer has not yet come?"],
   prayer="Lord, out of the depths I call to you. My soul waits for you more than watchmen wait for the morning. Keep my hope steady through the night, and let me trust your word until the light comes. Amen."),
  ml=dict(title="പ്രഭാതത്തിനായുള്ള കാത്തിരിപ്പ്", reflection="""
നൂറ്റിമുപ്പതാം സങ്കീർത്തനം തുടങ്ങുന്നത് ആഴങ്ങളിൽനിന്നാണ്; കരുണയ്ക്കായുള്ള ഒരു നിലവിളിയോടെ. മധ്യഭാഗത്തെത്തുമ്പോൾ ആ നിലവിളി കാത്തിരിപ്പായി മാറുന്നു. സങ്കീർത്തകൻ തന്റെ മുഴുവൻ ഉള്ളംകൊണ്ടും കർത്താവിനായി കാത്തിരിക്കുന്നു; ദൈവത്തിന്റെ വചനത്തിൽ പ്രത്യാശ വയ്ക്കുന്നു.

തുടർന്ന്, ഊന്നലിനായി രണ്ടുതവണ ആവർത്തിക്കുന്ന ഒരു ചിത്രം വരുന്നു: ഉഷസ്സിനായി നോക്കിയിരിക്കുന്ന കാവൽക്കാർ. നഗരമതിലിലെ രാത്രികാവൽക്കാരന് സൂര്യനെ നേരത്തേ ഉദിപ്പിക്കാൻ കഴിയില്ല. എങ്കിലും അത് ഉദിക്കുമെന്നതിൽ അവന് സംശയമില്ല. ക്ഷീണവും ജാഗ്രതയും ഉറപ്പും ഒരുമിച്ചുള്ളതാണ് അവന്റെ കാത്തിരിപ്പ്.

പല ക്രൈസ്തവ പാരമ്പര്യങ്ങളിലും നൂറ്റാണ്ടുകളായി സന്ധ്യാപ്രാർത്ഥനയിലും ദുഃഖസമയങ്ങളിലും ഈ സങ്കീർത്തനം പ്രാർത്ഥിച്ചുവരുന്നു. ദൈവത്തിനായി കാത്തിരിക്കുന്നത് അലസതയല്ലെന്ന് അത് പഠിപ്പിക്കുന്നു. ഇരുട്ടിൽ ഇളകാതെ പിടിച്ചിരിക്കുന്ന പ്രത്യാശയാണ് അത്; ഇതുവരെ കാണാൻ കഴിയുന്നതിലല്ല, ഒരു വാഗ്‌ദാനത്തിലാണ് അത് ആശ്രയിക്കുന്നത്.""",
   application="നിങ്ങൾ കാത്തിരിക്കുന്നതും വേഗത്തിലാക്കാൻ കഴിയാത്തതുമായ ഒരു കാര്യം ഓർക്കുക. ഇന്ന് ഉറങ്ങുന്നതിനു മുമ്പ് നൂറ്റിമുപ്പതാം സങ്കീർത്തനം സാവധാനം വായിക്കുക; ആ ഒരു കാര്യം ഈ രാത്രിയിലേക്ക് ദൈവത്തെ ഏല്പിക്കുക. പ്രഭാതം കൊണ്ടുവരുന്നത് അവിടുന്നായിരിക്കട്ടെ.",
   questions=["ഇപ്പോൾ ഞാൻ എന്തിനായാണ് കാത്തിരിക്കുന്നത്? എങ്ങനെയാണ് ഞാൻ കാത്തിരിക്കുന്നത്?",
              "ഉത്തരം ഇനിയും വന്നിട്ടില്ലാത്തപ്പോൾ ദൈവത്തിന്റെ ഏത് വാഗ്‌ദാനത്തിലാണ് എനിക്ക് മുറുകെപ്പിടിക്കാൻ കഴിയുക?"],
   prayer="കർത്താവേ, ആഴങ്ങളിൽനിന്ന് ഞാൻ അങ്ങയെ വിളിക്കുന്നു. ഉഷസ്സിനായി കാത്തിരിക്കുന്ന കാവൽക്കാരെക്കാൾ അധികം എന്റെ ഉള്ളം അങ്ങേക്കായി കാത്തിരിക്കുന്നു. രാത്രി മുഴുവൻ എന്റെ പ്രത്യാശയെ ഉറപ്പിച്ചുനിർത്തണമേ; വെളിച്ചം വരുന്നതുവരെ അങ്ങയുടെ വചനത്തിൽ ആശ്രയിക്കാൻ ഇടയാക്കണമേ. ആമേൻ.")),

 dict(slug="a-great-light", date="2026-11-29", theme="Hope and the coming of Christ", refs=[ref("ISA", 9, 2), ref("ISA", 9, 6)],
  en=dict(title="A Great Light", reflection="""
Isaiah spoke to people who had seen their northern lands overrun and humbled. To them he announced something no army could bring: a great light for a people walking in darkness. The light would come through a child, born for them, who would carry authority on his shoulders and be called by names of wisdom, strength and peace.

Christians have long read this promise as fulfilled in Jesus. Matthew's Gospel recalls these very words when Jesus begins to teach in Galilee, the same region Isaiah had named.

In these weeks before Christmas, churches of many traditions keep a season of waiting, known as Advent, the Season of Annunciation or the Nativity Fast. Each begins in the same place: we do not make the light ourselves. It is given, and we prepare to receive it.""",
   application="Light a candle or a lamp this evening, alone or with your family. Read Isaiah 9:2 and 9:6 aloud. Name one dark place in your life or in the world, and ask the Prince of Peace to bring his light there.",
   questions=["Where do I most need the light of Christ at this time?",
              "How could I prepare my heart, and not only my home, in the weeks before Christmas?"],
   prayer="Lord Jesus, light of those who walk in darkness, come. As we begin to prepare for your birth, shine on our homes, our churches and our land. Make us ready to receive you, Prince of Peace. Amen."),
  ml=dict(title="വലിയൊരു വെളിച്ചം", reflection="""
തങ്ങളുടെ വടക്കൻ ദേശങ്ങൾ കീഴടക്കപ്പെടുന്നതും അപമാനിക്കപ്പെടുന്നതും കണ്ട ഒരു ജനത്തോടാണ് യെശയ്യാവ് സംസാരിച്ചത്. ഒരു സൈന്യത്തിനും കൊണ്ടുവരാൻ കഴിയാത്ത ഒന്ന് അദ്ദേഹം അവരോട് പ്രഖ്യാപിച്ചു: ഇരുട്ടിൽ നടക്കുന്ന ജനത്തിന് വലിയൊരു വെളിച്ചം. അവർക്കായി ജനിക്കുന്ന ഒരു ശിശുവിലൂടെയാണ് ആ വെളിച്ചം വരിക; ആധിപത്യം അവന്റെ തോളിലായിരിക്കും; ജ്ഞാനത്തിന്റെയും ശക്തിയുടെയും സമാധാനത്തിന്റെയും പേരുകളിൽ അവൻ വിളിക്കപ്പെടും.

ഈ വാഗ്‌ദാനം യേശുവിൽ നിറവേറിയതായി ക്രൈസ്തവർ പണ്ടുമുതലേ വായിച്ചുവരുന്നു. യെശയ്യാവ് പേരെടുത്തു പറഞ്ഞ അതേ പ്രദേശമായ ഗലീലയിൽ യേശു പഠിപ്പിച്ചുതുടങ്ങുമ്പോൾ, മത്തായിയുടെ സുവിശേഷം ഈ വാക്കുകൾതന്നെ ഓർമ്മിപ്പിക്കുന്നു.

ക്രിസ്തുമസ്സിനു മുമ്പുള്ള ഈ ആഴ്ചകളിൽ പല പാരമ്പര്യങ്ങളിലുമുള്ള സഭകൾ കാത്തിരിപ്പിന്റെ ഒരു കാലം ആചരിക്കുന്നു: ആഗമനകാലം, മംഗളവാർത്തക്കാലം, യൽദോ നോമ്പ് എന്നിങ്ങനെ പല പേരുകളിൽ. എല്ലാം തുടങ്ങുന്നത് ഒരേ ഇടത്തുനിന്നാണ്: വെളിച്ചം നാം സ്വയം ഉണ്ടാക്കുന്നതല്ല. അത് നൽകപ്പെടുന്നതാണ്; അതിനെ സ്വീകരിക്കാൻ നാം ഒരുങ്ങുന്നു.""",
   application="ഇന്നു സന്ധ്യയ്ക്ക്, തനിച്ചോ കുടുംബത്തോടൊപ്പമോ, ഒരു മെഴുകുതിരിയോ വിളക്കോ കത്തിക്കുക. യെശയ്യാവ് 9:2, 9:6 എന്നീ വാക്യങ്ങൾ ഉറക്കെ വായിക്കുക. നിങ്ങളുടെ ജീവിതത്തിലോ ലോകത്തിലോ ഉള്ള ഇരുണ്ട ഒരിടം ഓർക്കുക; അവിടെ തന്റെ വെളിച്ചം കൊണ്ടുവരാൻ സമാധാനപ്രഭുവിനോട് അപേക്ഷിക്കുക.",
   questions=["ഇപ്പോൾ ക്രിസ്തുവിന്റെ വെളിച്ചം എനിക്ക് ഏറ്റവും ആവശ്യമുള്ളത് എവിടെയാണ്?",
              "ക്രിസ്തുമസ്സിനു മുമ്പുള്ള ആഴ്ചകളിൽ വീട് മാത്രമല്ല, എന്റെ ഹൃദയവും എങ്ങനെ ഒരുക്കാം?"],
   prayer="ഇരുട്ടിൽ നടക്കുന്നവരുടെ വെളിച്ചമായ കർത്താവായ യേശുവേ, വരണമേ. അങ്ങയുടെ ജനനത്തിനായി ഞങ്ങൾ ഒരുങ്ങിത്തുടങ്ങുമ്പോൾ ഞങ്ങളുടെ ഭവനങ്ങളിലും സഭകളിലും നാട്ടിലും പ്രകാശിക്കണമേ. സമാധാനപ്രഭുവേ, അങ്ങയെ സ്വീകരിക്കാൻ ഞങ്ങളെ ഒരുക്കണമേ. ആമേൻ.")),
]

out = []
for d in WEEK:
    item = {"slug": d["slug"], "publication_date": d["date"], "theme": d["theme"]}
    for lang in ("en", "ml"):
        x = d[lang]
        item[lang] = {"title": x["title"], "scripture_refs": d["refs"], "reflection": paras(x["reflection"]),
                      "application": x["application"], "reflection_questions": x["questions"], "prayer": x["prayer"]}
    out.append(item)
with open("content/devotionals/week-03.json", "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=1)
    f.write("\n")
print("wrote", len(out), "devotionals")
