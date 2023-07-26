import { BadRequestException, Injectable } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { User } from "../users/entities/user.entity"
import { Repository } from "typeorm"
import { CreateUserDto } from "../users/dto/create-user.dto"
import { ApiError } from "../../common/constants/errors"
import { UsersService } from "../users/users.service"
import { LoginUserDto } from "./dto/login-user.dto"
import * as bcrypt from "bcrypt"
import { TokenService } from "../token/token.service"
import { TokenResponse } from "./response/token.response"
import { GoogleLoginDto } from "./dto/google-login.dto"

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly tokenService: TokenService,
    private readonly usersService: UsersService,
  ) {}

  async registerUser(CreateUserDto: CreateUserDto): Promise<TokenResponse> {
    const existUser = await this.usersService.findUserByEmail(
      CreateUserDto.email,
    )
    if (existUser) throw new BadRequestException(ApiError.USER_EXIST)

    const newUser = await this.usersService.createUser(CreateUserDto)
    const tokens = await this.tokenService.getTokens(newUser)
    await this.tokenService.updateRefreshToken(newUser.id, tokens.refreshToken)

    return tokens
  }

  async loginUser(LoginUserDto: LoginUserDto): Promise<TokenResponse> {
    const existUser = await this.usersService.findUserByEmail(
      LoginUserDto.email,
    )
    if (!existUser || !existUser.password)
      throw new BadRequestException(ApiError.WRONG_DATA)

    const isPasswordValid = await bcrypt.compare(
      LoginUserDto.password,
      existUser.password,
    )
    if (!isPasswordValid) throw new BadRequestException(ApiError.WRONG_DATA)

    const tokens = await this.tokenService.getTokens(existUser)
    await this.tokenService.updateRefreshToken(
      existUser.id,
      tokens.refreshToken,
    )
    return tokens
  }

  async googleSignUp(email: string) {
    const newUser = await this.usersService.createUser({ email })
    const tokens = await this.tokenService.getTokens(newUser)
    await this.tokenService.updateRefreshToken(newUser.id, tokens.refreshToken)

    return tokens
  }
  async googleSignIn(loginDto: GoogleLoginDto) {
    const existUser = await this.usersService.findUserByEmail(loginDto.email)

    if (!existUser) return this.googleSignUp(loginDto.email)

    const tokens = await this.tokenService.getTokens(existUser)
    debugger
    await this.tokenService.updateRefreshToken(
      existUser.id,
      tokens.refreshToken,
    )
    return tokens
  }
}
