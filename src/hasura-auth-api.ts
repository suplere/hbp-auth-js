import axios, { AxiosError, AxiosInstance, AxiosResponse } from "axios";
import {
  ResetPasswordParams,
  ChangePasswordParams,
  SendVerificationEmailParams,
  SignUpEmailPasswordParams,
  SignInEmailPasswordParams,
  SignInPasswordlessEmailParams,
  SignInPasswordlessSmsParams,
  SignInPasswordlessSmsOtpParams,
  ChangeEmailParams,
  DeanonymizeParams,
  ApiSignInResponse,
  ApiSignOutResponse,
  ApiRefreshTokenResponse,
  ApiResetPasswordResponse,
  ApiChangePasswordResponse,
  ApiSendVerificationEmailResponse,
  ApiChangeEmailResponse,
  ApiDeanonymizeResponse,
  ApiError,
  ApiChangeNewPasswordViaTicket,
  AppUser,
  UpdateUserResponse,
} from "./utils/types";

const notImplementedOnHBPError: ApiError = {
  message:'Not implemented on backend HBP server.',
  status: 501
}

export class HasuraAuthApi {
  private url: string;
  private appId: string;
  private httpClient: AxiosInstance;
  private accessToken: string | undefined;

  constructor({ url = "", appId = null }) {
    this.url = url;
    this.appId = appId;

    this.httpClient = axios.create({
      baseURL: this.appId ? `${this.url}/custom/auth` : this.url,
      timeout: 10000,
      headers: {
        ...this.generateApplicationHeaders(),
      },
    });

    // convert axios error to custom ApiError
    this.httpClient.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        return Promise.reject({
          message:
            error.response?.data.message ||
            error.response?.data ||
            error.message ||
            JSON.stringify(error),
          status: error.response?.status || 500,
        });
      }
    );
  }

  /**
   * Use `signUpWithEmailAndPassword` to sign up a new user using email and password.
   */
  public async signUpEmailPassword(
    params: SignUpEmailPasswordParams
  ): Promise<ApiSignInResponse> {
    const url = this.appId ? "/register" : "/signup/email-password";
    const { email, password, options, register_options, user_data } = params;
    let signUpParams: SignUpEmailPasswordParams;
    if (this.appId) {
      // custom hasura plus params
      signUpParams = {
        email,
        password,
        register_options,
        user_data: {
          ...user_data,
          app_id: this.appId,
        },
      };
    } else {
      signUpParams = {
        email,
        password,
        options,
      };
    }
    try {
      const res = await this.httpClient.post(url, signUpParams);
      return { data: res.data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  public async signInEmailPassword(
    params: SignInEmailPasswordParams
  ): Promise<ApiSignInResponse> {
    try {
      if (this.appId) {
        params.cookie = false;
        const res = await this.httpClient.post("/login", params);
        return {
          data: {
            session: {
              accessToken: res.data.jwt_token,
              accessTokenExpiresIn: res.data.jwt_expires_in / 1000,
              refreshToken: res.data.refresh_token,
              user: res.data.user,
            },
            mfa: null
          },
          error: null,
        };
      } else {
        const res = await this.httpClient.post("/signin/email-password", params);
        return { data: res.data, error: null };
      }
    } catch (error) {
      return { data: null, error };
    }
  }

  public async signInPasswordlessEmail(
    params: SignInPasswordlessEmailParams
  ): Promise<ApiSignInResponse> {
    if (this.appId)
      return {
        data: null,
        error: notImplementedOnHBPError,
      };
    try {
      const res = await this.httpClient.post(
        "/signin/passwordless/email",
        params
      );
      return { data: res.data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  public async signInPasswordlessSms(
    params: SignInPasswordlessSmsParams
  ): Promise<ApiSignInResponse> {
    if (this.appId)
      return {
        data: null,
        error: notImplementedOnHBPError,
      };
    try {
      const res = await this.httpClient.post(
        "/signin/passwordless/sms",
        params
      );
      return { data: res.data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  public async signInPasswordlessSmsOtp(
    params: SignInPasswordlessSmsOtpParams
  ): Promise<ApiSignInResponse> {
    if (this.appId)
      return {
        data: null,
        error: notImplementedOnHBPError,
      };
    try {
      const res = await this.httpClient.post(
        "/signin/passwordless/sms/otp",
        params
      );
      return { data: res.data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  public async signOut(params: {
    refreshToken: string;
    all?: boolean;
  }): Promise<ApiSignOutResponse> {
    try {
      if (this.appId) {
        await this.httpClient.post(
          "/logout",
          {
            all: params.all ? params.all : null,
          },
          {
            params: {
              refresh_token: params.refreshToken,
            },
          }
        );
      } else {
        await this.httpClient.post("/signout", params);
      }
      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  public async refreshToken(params: {
    refreshToken: string;
  }): Promise<ApiRefreshTokenResponse> {
    try {
      let res: AxiosResponse<any, any>;
      if (this.appId) {
        const query = {
          refresh_token: params.refreshToken
        }
        res = await this.httpClient.get("/token/refresh", {  params: query });
        return {
          session: {
            accessToken: res.data.jwt_token,
            accessTokenExpiresIn: res.data.jwt_expires_in / 1000,
            refreshToken: res.data.refresh_token,
            user: res.data.user,
          },
          error: null,
        };
      } else {
        res = await this.httpClient.post("/token", params);
        return { session: res.data, error: null };
      }   
    } catch (error) {
      return { session: null, error };
    }
  }

  public async resetPassword(
    params: ResetPasswordParams
  ): Promise<ApiResetPasswordResponse> {
    try {
      const url = this.appId
        ? "/change-password/request"
        : "/user/password/reset";
      if (this.appId) params.app_id = this.appId;
      await this.httpClient.post(url, params);

      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  public async changePassword(
    params: ChangePasswordParams
  ): Promise<ApiChangePasswordResponse> {
    let changePasswordParams: ChangePasswordParams;
    let url: string;
    try {
      const { newPassword, new_password, old_password } = params;
      if (this.appId) {
        changePasswordParams = {
          new_password,
          old_password,
        };
        url = "/change-password";
      } else {
        changePasswordParams = {
          newPassword,
        };
        url = "/user/password";
      }
      await this.httpClient.post(url, changePasswordParams, {
        headers: {
          ...this.generateAuthHeaders(),
        },
      });

      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  public async sendVerificationEmail(
    params: SendVerificationEmailParams
  ): Promise<ApiSendVerificationEmailResponse> {
    if (this.appId)
      return {
        error: notImplementedOnHBPError,
      };
    try {
      await this.httpClient.post("/user/email/send-verification-email", params);

      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  public async changeEmail(
    params: ChangeEmailParams
  ): Promise<ApiChangeEmailResponse> {
    let changeEmailParams: ChangeEmailParams;
    let url: string;
    const { newEmail, new_email, options } = params;
    if (this.appId) {
      changeEmailParams = {
        new_email,
      };
      url = "/change-email";
    } else {
      changeEmailParams = {
        newEmail,
        options,
      };
      url = "/user/email/change";
    }
    try {
      await this.httpClient.post(url, changeEmailParams, {
        headers: {
          ...this.generateAuthHeaders(),
        },
      });

      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  public async deanonymize(
    params: DeanonymizeParams
  ): Promise<ApiDeanonymizeResponse> {
    if (this.appId)
      return {
        error: notImplementedOnHBPError,
      };
    try {
      await this.httpClient.post("/user/deanonymize", params);

      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  // deanonymize

  public async verifyEmail(params: {
    email: string;
    ticket: string;
  }): Promise<ApiSignInResponse> {
    if (this.appId)
      return {
        data: null,
        error: notImplementedOnHBPError,
      };
    try {
      const res = await this.httpClient.post("/user/email/verify", params);

      return { data: res.data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  public async changeNewPasswordViaTicket(params: {
    ticket: string;
    new_password: string;
  }): Promise<ApiChangeNewPasswordViaTicket> {
    try {
      const res = await this.httpClient.post("/change-password/change", params);

      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  public async updateUser(user: AppUser): Promise<UpdateUserResponse> {
    try{
      const res = await this.httpClient.post("/updateUserData", { user }, {
        headers: {
          ...this.generateAuthHeaders(),
        },
      })
      return {
        user: res.data,
        error: null
      }
    } catch (error) {
      return { user: null, error: error }
    }
  }

  public setAccessToken(accessToken: string | undefined) {
    this.accessToken = accessToken;
  }

  private generateAuthHeaders() {
    if (!this.accessToken) {
      return null;
    }

    return {
      Authorization: `Bearer ${this.accessToken}`,
    };
  }

  private generateApplicationHeaders() {
    if (!this.appId) {
      return null;
    }

    return {
      applicationid: this.appId,
    };
  }
}
