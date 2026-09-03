import Link from "next/link";

const STEPS = [
  { t: "레퍼런스 영상 올리기", d: "참고하고 싶은 릴스·쇼츠 영상(또는 오디오)을 끌어다 놓습니다. 최대 5개, 파일당 25MB." },
  { t: "언어 · 화자 구분 정하기", d: "음성 언어는 보통 자동 감지로 두면 됩니다. 두 사람 이상이 말하면 화자 구분을 켭니다(추정)." },
  { t: "「대본 생성」", d: "파일마다 음성을 글로 바꿉니다(OpenAI Whisper). 다듬기 지시를 적었다면 그 지시대로 문장을 정리합니다." },
  { t: "확인 · 복사 · SRT 저장", d: "영상 위에 자막으로 확인하고, 글만 복사하거나 SRT 자막 파일로 저장해 편집 프로그램에 붙입니다." },
];

export default function StepsPage() {
  return (
    <section className="panel steps" style={{ flex: "1 1 auto" }}>
      <h1 className="tool-title">순서</h1>
      <div className="tool-sub">레퍼런스 대본을 확보하는 4단계</div>
      <div style={{ marginTop: 12 }}>
        {STEPS.map((s, i) => (
          <div className="step" key={i}>
            <div className="num">{i + 1}</div>
            <div>
              <h3>{s.t}</h3>
              <p>{s.d}</p>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 18 }}>
        <Link href="/reference-script" className="btn">
          레퍼런스 대본 확보로 이동
        </Link>
      </div>
    </section>
  );
}
