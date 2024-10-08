import { PutBlobResult } from '@vercel/blob';
import FormData from 'form-data'
import axios from 'axios'
import { UserCustomConfig } from '../config';
import { JSONSchemaForNPMPackageJsonFiles } from '@schemastore/package';

export const upload = async (fd: FormData) => {
  const res = await axios('https://polymita.cc/api/market/upload', {
    method: 'POST',
    data: fd,
    headers: {
      'Content-Type': 'multipart/form-data',
    }
  })
  return res.data as {
    zipFileResult: PutBlobResult,
    metaFileResult: PutBlobResult,
    packageJsonFileResult: PutBlobResult,
  };
}

export const detail = async (name: string, version: string) => {
  const res = await axios('https://polymita.cc/api/market/detail', {
    method: 'GET',
    data: {
      name,
      version,
    },
  })
  return res.data as {
    zip: PutBlobResult,
    meta: UserCustomConfig,
    packageJson: JSONSchemaForNPMPackageJsonFiles,
  };
}

