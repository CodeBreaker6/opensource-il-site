import Head from "next/head";
import React, { useEffect, useMemo, useState } from "react";
import ReadmePreview from "@/components/MainContent/ReadmePreview";
import ReposList from "@/components/MainContent/ReposList/ReposList";
import PageTitle from "@/components/Header/PageTitle";
import Filters from "@/components/Header/Filters/Filters";
import CompaniesList from "@/components/MainContent/CompaniesList";
import { AllSortTypes } from "@/components/Header/types";
import { CompanyProps, DataProps, RepoProps, Views } from "@/types/index.types";
import Modal from "@/components/HelpModal";
import OrgIcon from "@/components/Icons/OrgIcon";
import ReposIcon from "@/components/Icons/ReposIcon";

const DEFAULT_READ_ME_PLACEHOLDER = `<div dir="rtl" style="font-size: 18px; font-family: 'Rubik'">בחרו ב-Repository מהרשימה כדי לקרוא את קובץ ה-README שלו!</div>`;

export default function Home() {
  const [view, setView] = useState<Views>("repos");
  const [companies, setCompanies] = useState<CompanyProps[]>([]);
  const [data, setData] = useState<DataProps[]>([]);
  const [showData, setShowData] = useState<DataProps[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [selectedLang, setSelectedLang] = useState("");
  const [readmePreview, setReadmePreview] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [activeSortType, setSortFunction] = useState<
    AllSortTypes | undefined
  >();

  useEffect(() => {
    setLoading(true);
    fetchRepos();
    fetchCompanies();
  }, []);

  const fetchCompanies = () => {
    fetch("https://os-il-api.vercel.app/api/allcomps")
      .then((res) => res.json())
      .then((data) => {
        setCompanies(data);
      });
  };

  const fetchRepos = () => {
    fetch("https://os-il-api.vercel.app/api/reposdb")
      .then<{ repository: RepoProps }[]>((res) => res.json())
      .then((data) => {
        const organizedData = data.map((proj) => {
          const repo = proj.repository;

          const nameWithOwner = repo.nameWithOwner;
          const image = repo.openGraphImageUrl;
          const description = repo.description ?? "";
          const lastCommit = repo.defaultBranchRef
            ? repo.defaultBranchRef.target.committedDate
            : "1970-01-01T00:00:00Z";
          const stargazerCount = repo.stargazerCount;
          const issuesCount = repo.openIssues.totalCount;
          const languages = repo.languages.edges.map((lang) => ({
            name: lang.node.name,
            size: lang.size,
          }));
          const totalSize = repo.languages.totalSize;

          return {
            image: image,
            owner: nameWithOwner.split("/")[0],
            name: nameWithOwner.split("/")[1],
            description: description,
            lastCommit: lastCommit,
            stars: stargazerCount,
            issuesCount: issuesCount,
            languages: languages,
            totalSize: totalSize,
          };
        });
        setData(organizedData);
        setShowData(organizedData);
        setLoading(false);
        setReadmePreview(DEFAULT_READ_ME_PLACEHOLDER);
      });
  };

  const fetchCompanyRepos = (company: string) => {
    setLoading(true);
    fetch(`https://os-il-api.vercel.app/api/company/${company}`)
      .then((res) => res.json())
      .then((data) => {
        setShowData(
          (data.organization.repositories.nodes as RepoProps[])
            .map((repo) => {
              const nameWithOwner = repo.nameWithOwner;
              const image = repo.openGraphImageUrl;
              const description = repo.description ?? "";
              const lastCommit = repo.defaultBranchRef
                ? repo.defaultBranchRef.target.committedDate
                : "1970-01-01T00:00:00Z";
              const stargazerCount = repo.stargazerCount;
              const issuesCount = repo.openIssues.totalCount;
              const languages = repo.languages.edges.map((lang) => ({
                name: lang.node.name,
                size: lang.size,
              }));
              const totalSize = repo.languages.totalSize;

              return {
                image: image,
                owner: nameWithOwner.split("/")[0],
                name: nameWithOwner.split("/")[1],
                description: description,
                lastCommit: lastCommit,
                stars: stargazerCount,
                issuesCount: issuesCount,
                languages: languages,
                totalSize: totalSize,
              };
            })
            .filter((repo: DataProps) => repo.name != ".github")
        );
        setView("repos");
        setLoading(false);
      });
  };

  const onSetReadMe = (readme: string) => {
    const foundReadme = showData.find(
      (repo) => `https://www.github.com/${repo.owner}/${repo.name}` === readme
    );
    if (foundReadme) {
      fetch(
        `https://api.github.com/repos/${foundReadme.owner}/${foundReadme.name}/readme`
      )
        .then((res) => res.json())
        .then((data) => {
          fetch(data.download_url)
            .then((res) => res.text())
            .then((data) => {
              const showdown = require("showdown"),
                converter = new showdown.Converter(),
                text = data,
                html = converter.makeHtml(text);
              setReadmePreview(html);
            });
        });
    }
  };

  const onSelectCompany = (company: string) => {
    fetchCompanyRepos(company);
    setSelectedLang("");
  };

  const handleSortChange = (sortType: AllSortTypes) => {
    let sorted;
    switch (sortType) {
      case "lastCommit":
        sorted = [...showData].sort((b: DataProps, a: DataProps) =>
          a.lastCommit < b.lastCommit ? -1 : a.lastCommit > b.lastCommit ? 1 : 0
        );
        break;
      case "lastCommitReverse":
        sorted = [...showData].sort((a: DataProps, b: DataProps) =>
          a.lastCommit < b.lastCommit ? -1 : a.lastCommit > b.lastCommit ? 1 : 0
        );
        break;
      case "stars":
        sorted = [...showData].sort(
          (b: DataProps, a: DataProps) => a.stars - b.stars
        );
        break;
      case "starsReverse":
        sorted = [...showData].sort(
          (a: DataProps, b: DataProps) => a.stars - b.stars
        );
        break;
      case "issues":
        sorted = [...showData].sort(
          (b: DataProps, a: DataProps) => a.issuesCount - b.issuesCount
        );
        break;
      case "issuesReverse":
        sorted = [...showData].sort(
          (a: DataProps, b: DataProps) => a.issuesCount - b.issuesCount
        );
        break;

      default:
        sorted = [...showData];
        break;
    }
    setShowData(sorted);
    setSortFunction(sortType);
  };

  const allLangs = useMemo(() => {
    return showData.reduce((allLangs: string[], repo: DataProps) => {
      if (repo.languages) {
        repo.languages.forEach((lang) => {
          if (!allLangs.includes(lang.name) && lang.name != "Dockerfile")
            allLangs.push(lang.name);
        });
      }
      return allLangs;
    }, []);
  }, [showData]);

  const dataForDisplay = useMemo(() => {
    return selectedLang === ""
      ? showData
      : showData.filter((repo: DataProps) =>
          repo.languages.find((language) => language.name == selectedLang)
        );
  }, [showData, selectedLang]);

  if (!data && !isLoading) return <p>Error loading data</p>;

  const currentView = {
    repos: <ReposList setReadme={onSetReadMe} showData={dataForDisplay} />,
    companies: (
      <CompaniesList companies={companies} setComp={onSelectCompany} />
    ),
  }[view];

  return (
    <>
      <Modal show={showModal} setShow={setShowModal}>
        <div dir="rtl" className="text-lg flex flex-col gap-4 h-auto">
          <p>ברוכים הבאים!</p>
          <p>
            באתר זה תוכלו למצוא פרויקטי קוד פתוח ישראליים וחברות ישראליות
            המתחזקות ספריות קוד פתוח, לקרוא על הפרויקטים ולמצוא את הפרויקט הבא
            (ואולי גם הראשון 😉) אליו תוכלו לתרום.
          </p>
          <p>
            במסך המאגרים (<ReposIcon setView={setView} view={view} />
            ), לחיצה על &quot;הצג מסננים&quot;, תפתח בפניכם מספר אפשרויות סינון
            שיעזרו לכם למצוא את הפרויקט האידיאלי עבורכם: <b>
              זמן גרסה אחרון
            </b>, <b>כמות כוכבים</b> ו-<b>כמות Issues פתוחים</b>. בנוסף, תוכלו
            לסנן את כל הפרויקטים המוצגים לפי שפת התכנות שלהם וכך לדייק את
            חיפושיכם לפרויקטים המתאימים לכם ביותר.
          </p>
          <p>
            בלחיצה על כפתור החברות ( <OrgIcon setView={setView} view={view} />{" "}
            ), יוצגו בפניכם עשרות חברות ישראליות המתחזקות ספריות קוד פתוח. בעוד
            שלחיצה על שם החברה יוביל לדף הבית שלה ב-GitHub, לחיצה על סמליל החברה
            יפתח בפניכם את כל מאגרי הקוד הפתוח הציבוריים שלה, אליהם תוכלו
            להצטרף.
          </p>
          <p>
            לחיצה על הקישור ל-GitHub בחלקו העליון של הדף, תוביל אתכם למאגר{" "}
            <a
              href="https://github.com/lirantal/awesome-opensource-israel"
              rel="noopener"
              target="_blank"
              className="font-medium text-blue-400 hover:underline decoration-dotted transition"
            >
              awesome-opensource-israel
            </a>
            , ממנו נמשכים המאגרים והארגונים המוצגים באתר זה.
          </p>
          <p>
            פרויקט נוסף אליו תוכלו לתרום קוד הוא{" "}
            <a
              href="https://github.com/yonatanmgr/opensource-il-site"
              rel="noopener"
              target="_blank"
              className="font-medium text-blue-400 hover:underline decoration-dotted transition"
            >
              אתר זה ממש
            </a>
            ! מוזמנים להצטרף לפיתוח, להוסיף תכולות ולסייע בתיקון תקלות - וכך
            לעזור לבנות בית לקוד הפתוח בישראל.
          </p>
          <p className="text-center opacity-50 text-sm">נוצר ע&quot;י יונתן מגר, 2023</p>
        </div>
      </Modal>
      <Head>
        <title>קוד פתוח ישראלי</title>
        <meta name="description" content="Open Source Community Israel" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {isLoading && (
        <div className="absolute w-screen h-screen bg-black/50">
          <div className="center h-10 w-10 border-8 border-mydarkblue border-t-myblue bg-transparent fixed left-[49%] top-[45%] rounded-full animate-spin"></div>
        </div>
      )}
      <main className="md:p-16 sm:p-8 p-6 pb-0 sm:pb-0 md:pb-0 flex flex-col justify-between items-center  min-h-screen max-h-screen gap-4">
        <div className="flex flex-col w-full gap-2.5">
          <PageTitle
            view={view}
            setView={(view) => {
              setReadmePreview(DEFAULT_READ_ME_PLACEHOLDER);
              setView(view);
            }}
          />
          {view === "repos" && (
            <Filters
              activeSortType={activeSortType}
              selectedLang={selectedLang}
              setSelectedLang={setSelectedLang}
              handleSortChange={handleSortChange}
              langs={allLangs}
            />
          )}
        </div>
        <div
          dir="rtl"
          className="w-full h-screen flex overflow-y-auto flex-row justify-between gap-2.5"
        >
          {currentView}
          <ReadmePreview readmePreview={readmePreview} />
        </div>
        <div
          className="fixed shadow-4xl left-5 bottom-6 sm:left-9 sm:bottom-10 border border-myblue bg-mydarkblue rounded-full w-14 h-14 hover:bg-buttonhover active:bg-buttonactive cursor-help transition flex flex-row items-center justify-center text-3xl select-none"
          onClick={() => setShowModal(true)}
        >
          ?
        </div>
      </main>
    </>
  );
}
