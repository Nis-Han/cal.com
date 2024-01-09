import { zodResolver } from "@hookform/resolvers/zod";
import type { GetServerSidePropsContext } from "next";
import { getSession } from "next-auth/react";
import type { TFunction } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useState } from "react";
import { useForm } from "react-hook-form";
import z from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { UserPermissionRole } from "@calcom/prisma/enums";
import { getStringAsNumberRequiredSchema } from "@calcom/prisma/zod-utils";
import { Button, Form, Meta, TextField, showToast } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

import { getLayout } from "./_OrgMigrationLayout";

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <Meta
        title="Organization Migration: Revert a team"
        description="Reverts a migration of a team to an organization"
      />
      {children}
    </div>
  );
}

const enum State {
  IDLE,
  LOADING,
  SUCCESS,
  ERROR,
}

export const getFormSchema = (t: TFunction) =>
  z.object({
    targetOrgId: z.union([getStringAsNumberRequiredSchema(t), z.number()]),
    teamId: z.union([getStringAsNumberRequiredSchema(t), z.number()]),
  });

export default function RemoveTeamFromOrg() {
  const [state, setState] = useState(State.IDLE);
  const { t } = useLocale();
  const formSchema = getFormSchema(t);
  const form = useForm({
    mode: "onSubmit",
    resolver: zodResolver(formSchema),
  });

  const register = form.register;

  return (
    <Wrapper>
      {/*  Due to some reason auth from website doesn't work if /api endpoint is used. Spent a lot of time and in the end went with submitting data to the same page, because you can't do POST request to a page in Next.js, doing a GET request  */}
      <Form
        form={form}
        className="space-y-6"
        handleSubmit={async (values) => {
          setState(State.LOADING);
          const res = await fetch(`/api/orgMigration/removeTeamFromOrg`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(values),
          });
          let response = null;
          try {
            response = await res.json();
          } catch (e) {
            if (e instanceof Error) {
              showToast(e.message, "error", 10000);
            } else {
              showToast(t("something_went_wrong"), "error", 10000);
            }
            setState(State.ERROR);
            return;
          }
          if (res.status === 200) {
            setState(State.SUCCESS);
            showToast(response.message, "success", 10000);
          } else {
            setState(State.ERROR);
            showToast(response.message, "error", 10000);
          }
        }}>
        <div className="space-y-6">
          <TextField
            label="Team ID"
            {...register("teamId")}
            required
            placeholder="Enter teamId to remove from org"
          />
          <TextField
            className="mb-0"
            {...register("targetOrgId")}
            label="Target Organization ID"
            type="number"
            required
            placeholder="Enter Target organization ID"
          />
        </div>
        <Button type="submit" loading={state === State.LOADING}>
          Remove Team from Org
        </Button>
      </Form>
    </Wrapper>
  );
}

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  const session = await getSession(ctx);
  if (!session || !session.user) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  const isAdmin = session.user.role === UserPermissionRole.ADMIN;
  if (!isAdmin) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }
  return {
    props: {
      ...(await serverSideTranslations(ctx.locale || "en", ["common"])),
    },
  };
}

RemoveTeamFromOrg.PageWrapper = PageWrapper;
RemoveTeamFromOrg.getLayout = getLayout;
