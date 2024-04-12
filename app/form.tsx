"use client";

import { useRef, useState, useTransition, useOptimistic } from "react";
import { v4 as uuidv4 } from "uuid";
import { saveGuestbook } from "./actions";
import { Guestbook } from "./types";
import { useSearchParams, useRouter } from "next/navigation";

type GuestbookState = {
  newGuestbook: Guestbook;
  pending: boolean;
  signed?: boolean;
};

export function GuestbookCreateForm() {
  let formRef = useRef<HTMLFormElement>(null);
  let [state, mutate] = useOptimistic(
    { pending: false },
    function createReducer(state, newGuestbook: GuestbookState) {
      return {
        pending: newGuestbook.pending,
      };
    }
  );

  let guestbookStub = {
    id: uuidv4(),
    created_at: new Date().getTime(),
    title: "",
  };
  let saveWithNewGuestbook = saveGuestbook.bind(null, guestbookStub);
  let [isPending, startTransition] = useTransition();

  return (
    <>
      <div className="mx-8 w-full">
        <form
          className="relative my-8"
          ref={formRef}
          action={saveWithNewGuestbook}
          onSubmit={(event) => {
            event.preventDefault();
            let formData = new FormData(event.currentTarget);
            let newGuestbook = {
              ...guestbookStub,
              title: formData.get("title") as string,
            };

            formRef.current?.reset();
            startTransition(async () => {
              mutate({
                newGuestbook,
                pending: true,
              });

              await saveGuestbook(newGuestbook, formData);
            });
          }}
        >
          <input
            aria-label="Guestbook Title"
            className="pl-3 pr-28 py-3 mt-1 text-lg block w-full border border-gray-200 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring focus:ring-blue-300"
            maxLength={150}
            placeholder="Title..."
            required
            type="text"
            name="title"
          />
          <div className={"pt-2 flex justify-end"}>
            <button
              className="flex items-center p-1 justify-center px-4 h-10 text-lg border bg-blue-500 text-white rounded-md w-24 focus:outline-none focus:ring focus:ring-blue-300 hover:bg-blue-700 focus:bg-blue-700"
              type="submit"
              disabled={state.pending}
            >
              Create
            </button>
          </div>
        </form>
      </div>
      <div className="w-full"></div>
    </>
  );
}

export function GuestbookSignForm({
  guestbook,
  viewResults,
}: {
  guestbook: Guestbook;
  viewResults?: boolean;
}) {
  const [signed, setSigned] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  viewResults = true; // Only allow signing via the api
  let formRef = useRef<HTMLFormElement>(null);
  let [isPending, startTransition] = useTransition();
  let [state, mutate] = useOptimistic(
    { showResults: viewResults },
    function createReducer({ showResults }, state: GuestbookState) {
      if (state.signed || viewResults) {
        return {
          showResults: true,
        };
      } else {
        return {
          showResults: false,
        };
      }
    }
  );

  return (
    <div className="max-w-sm rounded overflow-hidden shadow-lg p-4 m-4">
      <div className="font-bold text-xl mb-2">{guestbook.title}</div>
      <form
        className="relative my-8"
        ref={formRef}
        action={() => {
          /* Sign guestbook action */
        }}
        onSubmit={(event) => {
          event.preventDefault();
          let formData = new FormData(event.currentTarget);
          let newGuestbook = {
            ...guestbook,
          };

          formRef.current?.reset();
          startTransition(async () => {
            mutate({
              newGuestbook,
              pending: false,
              signed: true,
            });

            // Perform sign action and redirect
          });
        }}
      >
        {state.showResults ? (
          <div>Thank you for signing!</div>
        ) : (
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            type="submit"
          >
            Sign Guestbook
          </button>
        )}
      </form>
    </div>
  );
}
