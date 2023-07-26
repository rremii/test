import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common"
import { CreateUserDto } from "../users/dto/create-user.dto"
import { AuthService } from "./auth.service"
import { LoginUserDto } from "./dto/login-user.dto"
import { AuthResponse } from "./response/auth.response"
import { TokenService } from "../token/token.service"
import { Request, Response } from "express"
import { ConfigService } from "@nestjs/config"
import { GetCookieExpTime } from "../../common/helpers/getCookieExpTime"
import { GoogleAuthGuard } from "../../guards/google-auth.guard"
import { GoogleLoginDto } from "./dto/google-login.dto"
import { Profile } from "passport-google-oauth20"
import { AccessTokenGuard } from "../../guards/access-token.guard"
import { RefreshTokenGuard } from "../../guards/refresh-token.guard"

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,

    private readonly configService: ConfigService,
  ) {}

  @UsePipes(ValidationPipe)
  @Post("register")
  async register(
    @Body() userRegisterData: CreateUserDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const { accessToken, refreshToken } = await this.authService.registerUser(
      userRegisterData,
    )
    response.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: false,
      secure: true,

      maxAge: GetCookieExpTime(),
    })
    return { accessToken }
  }

  @Get("refresh")
  async refreshTokens(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { refreshToken } = request.cookies
    const { accessToken, refreshToken: newRefreshToken } =
      await this.tokenService.refreshTokens(refreshToken)
    response.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      path: "auth/refresh",
      sameSite: "none",
      secure: true,

      maxAge: GetCookieExpTime(),
    })
    return { accessToken }
  }

  @UsePipes(ValidationPipe)
  @Post("login")
  async login(
    @Body() userLoginData: LoginUserDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const { accessToken, refreshToken } = await this.authService.loginUser(
      userLoginData,
    )
    response.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      maxAge: GetCookieExpTime(),
    })
    return { accessToken }
  }

  @Get("google/login")
  @UseGuards(GoogleAuthGuard)
  googleLogin() {
    return {
      msg: "google auth",
    }
  }

  @Get("google/redirect")
  @UseGuards(GoogleAuthGuard)
  async googleRedirect(
    @Req() loginReq: Request<GoogleLoginDto>,
    @Res() response: Response,
  ) {
    const loginDto = loginReq.user as GoogleLoginDto

    const { accessToken, refreshToken } = await this.authService.googleSignIn(
      loginDto,
    )
    response.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      maxAge: GetCookieExpTime(),
    })
    response.redirect(this.configService.get("client_origin"))
  }

  @UseGuards(AccessTokenGuard)
  @Get("test")
  test() {
    return true
  }
}
