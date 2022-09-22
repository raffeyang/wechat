import { ActionPanel, Action, List, Icon, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useRef, useCallback } from "react";
import fetch, { AbortError } from "node-fetch";
import { URLSearchParams } from "url"
import { request } from 'urllib';

const [SEARCHURL, STARTURL] = ["http://localhost:48065/wechat/search", "http://localhost:48065/wechat/start"];

export default function Command() {
  const { state, search } = useSearch();

  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={search}
      searchBarPlaceholder="Search WeChat Contact..."
      throttle
    >
      <List.Section title="Contacts:" subtitle={state.items.length + ""}>
        {state.items.map((searchResult) => (
          <SearchListItem key={searchResult.title} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  async function startWeChat() {
    await request(searchResult.url);
  }
  return (
    <List.Item
      title={searchResult.title}
      subtitle={searchResult.subtitle}
      accessoryTitle={searchResult.arg}
      icon={searchResult.icon.path}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action icon={Icon.Message} title="Chat" onAction={startWeChat} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              icon={Icon.Clipboard}
              title="Copy WeChat ID"
              content={searchResult.title}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Feature Request" url="https://github.com/Jax0rz/wechat" shortcut={{ modifiers: ["cmd"], key: "h" }} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function useSearch() {
  const [state, setState] = useState<SearchState>({ items: [], isLoading: true });
  const cancelRef = useRef<AbortController | null>(null);

  const search = useCallback(
    async function search(searchText: string) {
      cancelRef.current?.abort();
      cancelRef.current = new AbortController();
      setState((oldState) => ({
        ...oldState,
        isLoading: true,
      }));
      try {
        const items = await performSearch(searchText, cancelRef.current.signal);
        setState((oldState) => ({
          ...oldState,
          items: items,
          isLoading: false,
        }));
      } catch (error) {
        setState((oldState) => ({
          ...oldState,
          isLoading: false,
        }));

        if (error instanceof AbortError) {
          return;
        }

        console.error("search error", error);
        showToast({ style: Toast.Style.Failure, title: "Could not perform search", message: String(error) });
      }
    },
    [cancelRef, setState]
  );

  useEffect(() => {
    search("");
    return () => {
      cancelRef.current?.abort();
    };
  }, []);

  return {
    state: state,
    search: search,
  };
}

async function performSearch(searchText: string, signal: AbortSignal): Promise<SearchResult[]> {
  const params = new URLSearchParams();

  params.append("keyword", searchText.length === 0 ? "@raycast/api" : searchText);

  const response = await fetch(SEARCHURL + "?" + params.toString(), {
    method: "get",
    signal: signal,
  });

  const start = STARTURL + "?" + "session" + "=";

  const json = (await response.json()) as
    | {
      items: {
        icon: { path: string };
        title: string;
        subtitle: string;
        arg: string;
        valid: number;
        url: string;
      }[];
    }
    | { code: string; message: string };

  if (!response.ok || "message" in json) {
    throw new Error("message" in json ? json.message : response.statusText);
  }

  return json.items.map((result) => {
    return {
      icon: { path: result.icon.path },
      title: result.arg,
      subtitle: result.title,
      arg: result.subtitle,
      valid: result.valid,
      url: start + result.arg,
    };
  });
}

interface SearchState {
  items: SearchResult[];
  isLoading: boolean;
}

interface SearchResult {
  icon: { path: string };
  title: string;
  subtitle: string;
  arg: string;
  valid: number;
  url: string;
}
